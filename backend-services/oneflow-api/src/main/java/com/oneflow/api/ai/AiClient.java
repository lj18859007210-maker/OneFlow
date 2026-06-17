package com.oneflow.api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oneflow.api.config.OneFlowProperties;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Component
public class AiClient {

    private final OneFlowProperties properties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public AiClient(OneFlowProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String call(String prompt) {
        if (properties.getAi().isMockEnabled()) {
            return "AI mock response: " + prompt;
        }
        if (!StringUtils.hasText(properties.getAi().getBaseUrl()) || !StringUtils.hasText(properties.getAi().getModel())) {
            throw new IllegalStateException("AI service is not configured");
        }
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(buildUrl(), buildRequest(prompt), String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("AI upstream returned " + response.getStatusCodeValue());
            }
            return extractText(response.getBody());
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException(ex.getMessage(), ex);
        }
    }

    private String buildUrl() {
        String baseUrl = trimTrailingSlash(properties.getAi().getBaseUrl());
        return isOpenAiCompatible() ? baseUrl + "/chat/completions" : baseUrl + "/api/generate";
    }

    private HttpEntity<Map<String, Object>> buildRequest(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (StringUtils.hasText(properties.getAi().getApiKey())) {
            headers.set("Authorization", "Bearer " + properties.getAi().getApiKey());
        }

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("model", properties.getAi().getModel());
        body.put("stream", false);
        if (isOpenAiCompatible()) {
            Map<String, Object> message = new LinkedHashMap<String, Object>();
            message.put("role", "user");
            message.put("content", prompt);
            body.put("messages", Collections.singletonList(message));
        } else {
            body.put("prompt", prompt);
        }
        return new HttpEntity<Map<String, Object>>(body, headers);
    }

    private boolean isOpenAiCompatible() {
        String baseUrl = String.valueOf(properties.getAi().getBaseUrl());
        return "openai".equals(properties.getAi().getProvider()) || baseUrl.endsWith("/v1") || baseUrl.endsWith("/v1/");
    }

    private String extractText(String rawBody) throws Exception {
        JsonNode root = objectMapper.readTree(StringUtils.hasText(rawBody) ? rawBody : "{}");
        JsonNode openAiText = root.path("choices").path(0).path("message").path("content");
        String text = openAiText.isMissingNode() || openAiText.isNull() ? root.path("response").asText("") : openAiText.asText("");
        return text.replaceAll("(?is)<think.*?</think>", "").trim();
    }

    private String trimTrailingSlash(String value) {
        return String.valueOf(value == null ? "" : value).replaceAll("/+$", "");
    }
}
