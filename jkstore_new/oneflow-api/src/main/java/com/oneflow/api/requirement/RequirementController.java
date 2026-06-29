package com.oneflow.api.requirement;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/requirements")
public class RequirementController {

    private final RequirementRepository requirementRepository;
    private final AuthSupport authSupport;

    public RequirementController(RequirementRepository requirementRepository, AuthSupport authSupport) {
        this.requirementRepository = requirementRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> all(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "platform", required = false) String platform,
            @RequestParam(value = "developer", required = false) String developer,
            @RequestParam(value = "priority", required = false) String priority,
            @RequestParam(value = "dateStart", required = false) String dateStart,
            @RequestParam(value = "dateEnd", required = false) String dateEnd,
            @RequestParam(value = "minScore", required = false) Double minScore,
            @RequestParam(value = "maxScore", required = false) Double maxScore,
            @RequestParam(value = "isOverdue", required = false) String isOverdue) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) {
            return denied;
        }

        // 保留旧 Node 列表接口的平铺响应结构，并继续支持首页筛选栏传入的全部查询参数。
        Map<String, Object> result = requirementRepository.findPage(
                page, pageSize, keyword, status, platform, developer, priority,
                dateStart, dateEnd, minScore, maxScore, isOverdue, user);
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("success", true);
        response.putAll(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/approval-list")
    public ResponseEntity<?> approvalList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "50") int pageSize,
            @RequestParam(value = "approvalStatus", required = false) String approvalStatus,
            @RequestParam(value = "keyword", required = false) String keyword) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:approve");
        if (denied != null) return denied;
        Map<String, Object> result = requirementRepository.findApprovalPage(page, pageSize, approvalStatus, keyword, user);
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("success", true);
        response.putAll(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    public ResponseEntity<?> my(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        Map<String, Object> result = requirementRepository.findMine(page, pageSize, user);
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("success", true);
        response.putAll(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/drafts")
    public ResponseEntity<?> drafts(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "submitter", required = false) String submitter) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(requirementRepository.findDrafts(user, submitter)));
    }

    @GetMapping("/drafts/latest")
    public ResponseEntity<?> latestDraft(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "submitter", required = false) String submitter) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        Map<String, Object> draft = requirementRepository.findLatestDraft(user, submitter);
        if (draft == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "draft not found"));
        }
        return ResponseEntity.ok(ApiResponse.success(draft));
    }

    @GetMapping("/gantt")
    public ResponseEntity<?> gantt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "platform", required = false) String platform,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "developer", required = false) String developer) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        Map<String, Object> result = requirementRepository.findGanttData(platform, status, developer, user);
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("success", true);
        response.putAll(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(requirementRepository.buildDashboard(user)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> byId(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) {
            return denied;
        }
        Map<String, Object> requirement = requirementRepository.findById(id);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        if (!requirementRepository.canView(user, requirement)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "当前账号不能查看该需求"));
        }
        return ResponseEntity.ok(ApiResponse.success(requirement));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:create");
        if (denied != null) {
            return denied;
        }
        Map<String, Object> requirement = requirementRepository.create(body, user);
        ApiResponse<Map<String, Object>> response = ApiResponse.success(requirement);
        response.setMessage("requirement created");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireAnyPermission(user, "requirement:update", "requirement:create");
        if (denied != null) {
            return denied;
        }
        Map<String, Object> current = requirementRepository.findById(id);
        if (current == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        if (!requirementRepository.canEdit(user, current)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "当前账号不能修改该需求"));
        }
        Map<String, Object> requirement = requirementRepository.update(id, body);
        ApiResponse<Map<String, Object>> response = ApiResponse.success(requirement);
        response.setMessage("requirement updated");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:update");
        if (denied != null) {
            return denied;
        }
        boolean removed = requirementRepository.remove(id);
        if (!removed) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("requirement removed");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:approve");
        if (denied != null) {
            return denied;
        }
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        String comment = body.get("comment") == null ? null : String.valueOf(body.get("comment"));
        Map<String, Object> requirement = requirementRepository.approve(id, approved, comment);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        ApiResponse<Map<String, Object>> response = ApiResponse.success(requirement);
        response.setMessage(approved ? "approved" : "rejected");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:update");
        if (denied != null) {
            return denied;
        }
        String status = body.get("status") == null ? "" : String.valueOf(body.get("status"));
        if (!StringUtils.hasText(status)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, "status is required"));
        }
        Map<String, Object> requirement = requirementRepository.updateStatus(id, status);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        ApiResponse<Map<String, Object>> response = ApiResponse.success(requirement);
        response.setMessage("status updated");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/score")
    public ResponseEntity<?> score(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:score");
        if (denied != null) {
            return denied;
        }
        Number score = body.get("score") instanceof Number
                ? (Number) body.get("score")
                : Double.valueOf(String.valueOf(body.get("score")));
        Map<String, Object> requirement = requirementRepository.score(id, score);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        ApiResponse<Map<String, Object>> response = ApiResponse.success(requirement);
        response.setMessage("score updated");
        return ResponseEntity.ok(response);
    }

    private CurrentUser requireUser(String authorization) {
        return authSupport.parseBearerUser(authorization);
    }

    private ResponseEntity<ApiResponse<String>> requirePermission(CurrentUser user, String permission) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, permission)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: " + permission + " is required"));
        }
        return null;
    }

    private ResponseEntity<ApiResponse<String>> requireAnyPermission(CurrentUser user, String first, String second) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, first) && !authSupport.hasPermission(user, second)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: one of " + first + ", " + second + " is required"));
        }
        return null;
    }
}
