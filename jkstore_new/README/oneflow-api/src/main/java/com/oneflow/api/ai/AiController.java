package com.oneflow.api.ai;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final AuthSupport authSupport;

    public AiController(AiService aiService, AuthSupport authSupport) {
        this.aiService = aiService;
        this.authSupport = authSupport;
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireUser(user);
        if (denied != null) return denied;
        String prompt = text(body == null ? null : body.get("prompt"));
        if (!StringUtils.hasText(prompt)) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, "prompt 不能为空"));
        }
        try {
            return ResponseEntity.ok(ApiResponse.success(aiService.generate(prompt)));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<String>failure(500, "AI 服务调用失败: " + ex.getMessage()));
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireUser(user);
        if (denied != null) return denied;
        String question = text(body == null ? null : body.get("question"));
        if (!StringUtils.hasText(question)) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, "问题不能为空"));
        }
        try {
            return ResponseEntity.ok(ApiResponse.success(aiService.chat(question, user)));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<String>failure(500, "AI 服务调用失败: " + ex.getMessage()));
        }
    }

    private ResponseEntity<ApiResponse<String>> requireUser(CurrentUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        return null;
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }
}
