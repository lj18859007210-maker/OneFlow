package com.oneflow.api.ai;

import com.oneflow.api.auth.CurrentUser;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AiService {

    private final AiClient aiClient;
    private final AiRepository aiRepository;

    public AiService(AiClient aiClient, AiRepository aiRepository) {
        this.aiClient = aiClient;
        this.aiRepository = aiRepository;
    }

    public String generate(String prompt) {
        return aiClient.call(prompt);
    }

    public String chat(String question, CurrentUser user) {
        Map<String, Object> context = aiRepository.loadContext(user);
        return aiClient.call(buildPrompt(question, context, user));
    }

    private String buildPrompt(String question, Map<String, Object> context, CurrentUser user) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("今天是").append(context.get("today")).append("。你是 OneFlow 需求管理平台的 AI 助手。\n");
        if (user != null) {
            prompt.append("当前登录用户：").append(user.getName()).append("，角色：").append(user.getRole()).append("。\n");
        }
        prompt.append("需求总数：").append(context.get("total")).append("。\n");
        prompt.append("需求字段：title|status|priority|score|developer|submitter|platform|capability|expectedDate|actualDate|createdAt|updatedAt\n");
        Object all = context.get("all");
        if (all instanceof List) {
            for (Object item : (List<?>) all) {
                if (item instanceof Map) {
                    Map<?, ?> row = (Map<?, ?>) item;
                    prompt.append(value(row, "title")).append('|')
                            .append(value(row, "status")).append('|')
                            .append(value(row, "priority")).append('|')
                            .append(value(row, "score")).append('|')
                            .append(value(row, "developer")).append('|')
                            .append(value(row, "submitter")).append('|')
                            .append(value(row, "platform")).append('|')
                            .append(value(row, "capability")).append('|')
                            .append(value(row, "expectedDate")).append('|')
                            .append(value(row, "actualDate")).append('|')
                            .append(value(row, "createdAt")).append('|')
                            .append(value(row, "updatedAt")).append('\n');
                }
            }
        }
        prompt.append("用户提问：").append(question);
        return prompt.toString();
    }

    private String value(Map<?, ?> row, String key) {
        Object value = row.get(key);
        return value == null ? "" : String.valueOf(value);
    }
}
