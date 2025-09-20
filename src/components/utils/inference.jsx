
import { InvokeLLM } from "@/api/integrations";
import { SystemSetting } from "@/api/entities";
import { MLModel } from "@/api/entities";
import { localModelInference } from "@/api/functions";

// Helper to get model features from either structured data or a text prompt
function extractFeaturesFromData(data, prompt) {
  const features = {};
  
  // Prioritize structured data if available
  if (data) {
    // Demographics
    if (data.patient?.age) features.age = data.patient.age;
    if (data.patient?.gender) features.sex = data.patient.gender === 'male' ? 1 : 0;

    // Vitals
    if (data.vital_signs) {
      if (data.vital_signs.systolic_bp) features.trestbps = Number(data.vital_signs.systolic_bp);
      if (data.vital_signs.heart_rate) features.thalach = Number(data.vital_signs.heart_rate);
      if (data.vital_signs.cholesterol) features.chol = Number(data.vital_signs.cholesterol);
    }

    // Labs (map total cholesterol if present)
    if (data.lab_results?.lipid_profile?.total_cholesterol) {
      features.chol = Number(data.lab_results.lipid_profile.total_cholesterol);
    }
  }
  
  // Fallback to parsing prompt if data is missing (for NewDiagnosis page)
  if (Object.keys(features).length === 0 && prompt) {
    const ageMatch = prompt.match(/age[:\s]*(\d+)/i);
    if (ageMatch) features.age = parseInt(ageMatch[1]);
    
    const bpMatch = prompt.match(/blood[_\s]pressure[:\s]*(\d+)\/(\d+)/i);
    if (bpMatch) features.trestbps = parseInt(bpMatch[1]);
    
    const hrMatch = prompt.match(/heart[_\s]rate[:\s]*(\d+)/i);
    if (hrMatch) features.thalach = parseInt(hrMatch[1]);
    
    const cholMatch = prompt.match(/cholesterol[:\s]*(\d+)/i);
    if (cholMatch) features.chol = parseInt(cholMatch[1]);
    
    if (prompt.toLowerCase().includes('male') && !prompt.toLowerCase().includes('female')) features.sex = 1;
    else if (prompt.toLowerCase().includes('female')) features.sex = 0;
    
    if (prompt.toLowerCase().includes('chest pain')) features.cp = 1;
  }
  
  const defaultFeatures = {
    age: 50, sex: 1, cp: 0, trestbps: 120, chol: 200, fbs: 0, restecg: 0, thalach: 150, exang: 0, oldpeak: 1.0, slope: 1, ca: 0, thal: 2
  };
  
  return { ...defaultFeatures, ...features };
}

// Define which model types can be used for each analysis type
const MODEL_TYPE_COMPATIBILITY = {
  heart_disease: ['heart_disease', 'symptom_analysis'], // Allow both heart disease and symptom analysis models
  image_classification: ['image_classification']
};

function adjustRiskWithRules(structuredInput, prediction, thresholds) {
  if (!structuredInput || !structuredInput.vital_signs) return prediction;
  const vit = structuredInput.vital_signs || {};
  const sys = Number(vit.systolic_bp);
  const dia = Number(vit.diastolic_bp);
  const hr = Number(vit.heart_rate);
  const spo2 = Number(vit.oxygen_saturation);

  let score = typeof prediction.risk_score === 'number' ? prediction.risk_score : 0;
  let level = prediction.risk_level;

  // Apply simple additive adjustments based on vitals
  if (!Number.isNaN(sys) && sys >= (thresholds?.systolic_bp_high ?? 160)) score += 7;
  if (!Number.isNaN(dia) && dia >= (thresholds?.diastolic_bp_high ?? 100)) score += 5;
  if (!Number.isNaN(hr) && hr >= (thresholds?.heart_rate_high ?? 110)) score += 5;
  if (!Number.isNaN(spo2) && spo2 > 0 && spo2 <= (thresholds?.spo2_low ?? 92)) score += 8;

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Map back to level if needed
  if (!level) {
    if (score >= 95) level = "critical";
    else if (score >= 80) level = "high";
    else if (score >= 50) level = "moderate";
    else level = "low";
  } else {
    // Optionally promote level if score became very high
    if (score >= 95) level = "critical";
    else if (score >= 80 && (level === "moderate" || level === "low")) level = "high";
  }

  return { ...prediction, risk_score: score, risk_level: level };
}

export async function getAIAnalysis(prompt, responseSchema = null, structuredInput = null, modelType = 'heart_disease') {
  try {
    let settings = await SystemSetting.list();
    let currentSetting;

    // Self-healing: If no settings exist, create a default one.
    if (settings.length === 0) {
      currentSetting = await SystemSetting.create({ active_model_type: 'api' });
    } else {
      currentSetting = settings[0];
    }
    
    // Check if we have an active model for the specific model type
    const activeModel = await getActiveModelForType(currentSetting, modelType);
    
    if (!activeModel) {
      // Return a "no model active" response instead of throwing an error
      return createNoModelActiveResponse(modelType, responseSchema);
    }
    
    if (currentSetting && currentSetting.active_model_type === 'local') {
      // Pass modelType to getLocalModelPrediction
      return await getLocalModelPrediction(prompt, responseSchema, structuredInput, activeModel, modelType, currentSetting);
    } else {
      return await getAPIModelPrediction(prompt, responseSchema, activeModel);
    }
  } catch (error) {
    console.error("AI Analysis error:", error);
    throw error;
  }
}

async function getActiveModelForType(setting, modelType) {
  if (!setting) return null;
  
  const isLocal = setting.active_model_type === 'local';
  let modelId;
  
  if (modelType === 'heart_disease') {
    modelId = isLocal ? setting.active_local_heart_disease_model_id : setting.active_api_heart_disease_model_id;
  } else if (modelType === 'image_classification') {
    modelId = isLocal ? setting.active_local_image_analysis_model_id : setting.active_api_image_analysis_model_id;
  }
  
  // If we have a specific model ID, try to get it
  if (modelId) {
    try {
      const model = await MLModel.get(modelId);
      if (model && model.is_active) {
        return model;
      }
    } catch (error) {
      console.error("Error fetching specific model:", error);
    }
  }
  
  // If no specific model ID or that model failed, look for any compatible active model
  try {
    const allModels = await MLModel.list();
    const compatibleTypes = MODEL_TYPE_COMPATIBILITY[modelType] || [modelType];
    
    // Find active models that match the requested analysis type
    const compatibleModels = allModels.filter(m => {
      const isCorrectInfrastructure = isLocal ? !!m.model_file_url : !m.model_file_url;
      const isCompatibleType = compatibleTypes.some(compatibleType => {
        // Normalize both the model type and compatible type for comparison
        const normalizedModelType = m.model_type?.toLowerCase().replace(/[_\s]/g, '');
        const normalizedCompatibleType = compatibleType.toLowerCase().replace(/[_\s]/g, '');
        return normalizedModelType === normalizedCompatibleType || 
               normalizedModelType.includes(normalizedCompatibleType) ||
               normalizedCompatibleType.includes(normalizedModelType);
      });
      
      return m.is_active && isCorrectInfrastructure && isCompatibleType;
    });
    
    if (compatibleModels.length > 0) {
      console.log(`Found compatible ${isLocal ? 'local' : 'API'} model for ${modelType}:`, compatibleModels[0].model_name);
      return compatibleModels[0];
    }
  } catch (error) {
    console.error("Error searching for compatible models:", error);
  }
  
  // If no compatible models found and we're in API mode, return default
  if (!isLocal) {
    return { 
      id: 'default-api', 
      model_name: 'InvokeLLM API', 
      model_type: modelType,
      is_active: true 
    };
  }
  
  return null;
}

function createNoModelActiveResponse(modelType, responseSchema) {
  if (modelType === 'heart_disease') {
    return {
      no_model_active: true,
      message: "No active heart disease or symptom analysis model found. Please activate a compatible model in ML Model Management.",
      model_type: modelType
    };
  } else if (modelType === 'image_classification' && responseSchema && responseSchema.properties.document_analysis) {
    return {
      no_model_active: true,
      message: "No active image analysis model found. OCR extraction completed successfully, but AI analysis requires an active model.",
      model_type: modelType,
      document_analysis: {
        document_type: "No Model Active",
        key_findings: ["OCR extraction completed successfully"],
        abnormal_values: [],
        clinical_significance: "No active image analysis model found. Please activate a model in ML Model Management to perform AI analysis."
      },
      patient_correlation: {
        symptom_correlation: [],
        historical_comparison: "Analysis unavailable - no active model",
        risk_progression: "unknown"
      },
      clinical_recommendations: {
        immediate_actions: ["Activate an image analysis model", "Review extracted information manually"],
        follow_up_tests: [],
        medication_adjustments: [],
        lifestyle_modifications: []
      },
      risk_assessment: {
        overall_risk: "unknown",
        confidence: 0,
        risk_factors: ["No active model for analysis"],
        protective_factors: []
      }
    };
  }
  
  return {
    no_model_active: true,
    message: "No active model found for the requested analysis.",
    model_type: modelType
  };
}

async function getAPIModelPrediction(prompt, responseSchema, model) {
  // For API models, we can still use InvokeLLM as the core engine
  // The model record just tracks which "configuration" to use
  return await InvokeLLM({
    prompt: prompt,
    response_json_schema: responseSchema,
    add_context_from_internet: false
  });
}

async function getLocalModelPrediction(prompt, responseSchema, structuredInput = null, model, modelType, currentSetting) {
  try {
    const inputData = extractFeaturesFromData(structuredInput, prompt);
    
    const { data: localPrediction, error } = await localModelInference({
      model_id: model.id,
      input_data: inputData
    });

    // The backend function now always returns a 200 status with either real prediction or fallback
    if (error) {
      console.error("Local model inference backend error:", error);
      
      // Use mock prediction from model as final fallback
      if (model.mock_prediction_output) {
        console.log("Using model's mock prediction output as fallback");
        return handleMockPrediction(model.mock_prediction_output, responseSchema, structuredInput);
      }
      
      // Ultimate fallback
      return createDefaultFallback(modelType);
    }

    // Handle complex analysis pages like ImageAnalysis
    if (responseSchema && responseSchema.properties && responseSchema.properties.document_analysis) {
      const llmPrompt = `As a clinical AI specialist, generate a comprehensive analysis based on the provided OCR data and the output from our internal, trusted ML model.

      **OCR Data from Medical Document:**
      ${JSON.stringify(structuredInput, null, 2)}
      
      **Internal ML Model Prediction:**
      - Risk Level: ${localPrediction.risk_level}
      - Risk Score: ${localPrediction.risk_score}
      - Confidence: ${localPrediction.confidence}%
      - Key Findings: ${localPrediction.predicted_conditions ? localPrediction.predicted_conditions.map(c => c.condition).join(', ') : 'None'}
      
      **Your Task:**
      Using ALL the information above, generate a complete, context-aware clinical analysis that fills out the required JSON schema. Correlate the OCR findings with the patient's history and expand upon the local model's prediction.
      `;
      
      return await InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: responseSchema,
        add_context_from_internet: false
      });
    } else {
      // For simpler pages like NewDiagnosis, return the direct prediction
      // Optional risk adjustment for NewDiagnosis (heart_disease)
      let finalPred = localPrediction;
      if (currentSetting?.risk_adjustment_enabled) {
        finalPred = adjustRiskWithRules(structuredInput, localPrediction, currentSetting.risk_adjustment_thresholds || {});
      }
      return finalPred;
    }
    
  } catch (error) {
    console.error("Local model prediction wrapper error:", error);
    
    // Final fallback using model's mock prediction
    if (model && model.mock_prediction_output) {
      console.log("Using mock prediction output as final fallback");
      return handleMockPrediction(model.mock_prediction_output, responseSchema, structuredInput);
    }
    
    // Ultimate fallback
    return createDefaultFallback(modelType);
  }
}

function handleMockPrediction(mockData, responseSchema, structuredInput) {
  // If the request is for the complex ImageAnalysis page, use the mock data to inform a final LLM call.
  if (responseSchema && responseSchema.properties && responseSchema.properties.document_analysis) {
    const llmPrompt = `As a clinical AI specialist, generate a comprehensive analysis based on the provided OCR data and this mock prediction output from our trusted ML model.

    **OCR Data from Medical Document:**
    ${JSON.stringify(structuredInput, null, 2)}
    
    **Mock ML Model Prediction (simulated output):**
    - Risk Level: ${mockData.risk_level}
    - Risk Score: ${mockData.risk_score}
    - Confidence: ${mockData.confidence}%
    - Key Finding: ${mockData.predicted_conditions ? mockData.predicted_conditions.map(c => typeof c === 'string' ? c : c.condition).join(', ') : 'None'}
    
    **Your Task:**
    Using ALL the information above, generate a complete, context-aware clinical analysis that fills out the required JSON schema. Note that this is using simulated model output due to execution issues.
    `;
    
    return InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: responseSchema,
      add_context_from_internet: false
    });
  } else {
    // For simpler pages like NewDiagnosis, return the mock prediction directly
    return mockData;
  }
}

function createDefaultFallback(modelType) {
  if (modelType === 'heart_disease') {
    return {
      risk_level: "moderate",
      risk_score: 65,
      confidence: 75,
      predicted_conditions: [
        {
          condition: "Cardiovascular risk assessment unavailable",
          severity: "moderate"
        }
      ],
      recommendations: {
        lifestyle: [
          "Maintain regular physical activity",
          "Follow heart-healthy diet"
        ],
        medications: [
          "Consult with physician"
        ],
        follow_up: "Schedule follow-up assessment",
        referrals: []
      },
      urgent_warning_signs: [],
      guideline_references: [],
      decision_support_flags: [
        "System fallback prediction - clinical assessment required"
      ]
    };
  }
  
  // Default fallback for other types (e.g., image_classification)
  return {
    error: "Model prediction unavailable",
    message: "Please use clinical judgment"
  };
}
