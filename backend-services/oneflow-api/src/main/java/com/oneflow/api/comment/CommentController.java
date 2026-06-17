package com.oneflow.api.comment;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.requirement.RequirementRepository;
import com.oneflow.api.security.AuthSupport;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentRepository commentRepository;
    private final RequirementRepository requirementRepository;
    private final AuthSupport authSupport;

    public CommentController(
            CommentRepository commentRepository,
            RequirementRepository requirementRepository,
            AuthSupport authSupport) {
        this.commentRepository = commentRepository;
        this.requirementRepository = requirementRepository;
        this.authSupport = authSupport;
    }

    @GetMapping("/{requirementId}")
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String requirementId) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireRequirementView(user);
        if (denied != null) {
            return denied;
        }
        Map<String, Object> requirement = requirementRepository.findById(requirementId);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        if (!requirementRepository.canView(user, requirement)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "当前账号不能查看该需求"));
        }
        List<Map<String, Object>> comments = commentRepository.findByRequirementId(requirementId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireRequirementView(user);
        if (denied != null) {
            return denied;
        }

        String requirementId = optionalString(body, "requirementId");
        String type = optionalString(body, "type");
        String content = optionalString(body, "content");
        if (!StringUtils.hasText(requirementId) || !StringUtils.hasText(type) || !StringUtils.hasText(content)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, "缺少必要参数"));
        }

        Map<String, Object> requirement = requirementRepository.findById(requirementId);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        if (!requirementRepository.canView(user, requirement)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "当前账号不能操作该需求"));
        }

        // 通知和邮件队列属于跨模块副作用，先不混入评论核心写入。
        // 后续迁移 notifications/email 时，再从这里挂服务层调用，避免评论模块直接依赖未迁移项目。
        Map<String, Object> comment = commentRepository.create(body, user);
        ApiResponse<Map<String, Object>> response = ApiResponse.success(comment);
        response.setMessage("评论创建成功");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private ResponseEntity<ApiResponse<String>> requireRequirementView(CurrentUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "requirement:view")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: requirement:view is required"));
        }
        return null;
    }

    private String optionalString(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        String value = String.valueOf(body.get(key)).trim();
        return value.isEmpty() ? null : value;
    }
}
