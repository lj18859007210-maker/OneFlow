package com.oneflow.api.notification;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final AuthSupport authSupport;

    public NotificationController(NotificationRepository notificationRepository, AuthSupport authSupport) {
        this.notificationRepository = notificationRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "isRead", required = false) Boolean isRead,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireNotificationView(user);
        if (denied != null) return denied;
        Map<String, Object> result = notificationRepository.findByUserId(user.getId(), isRead, type, page, pageSize);
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("success", true);
        response.putAll(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(@RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireNotificationView(user);
        if (denied != null) return denied;
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("count", notificationRepository.unreadCount(user.getId()));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireNotificationView(user);
        if (denied != null) return denied;
        notificationRepository.markAsRead(id, user.getId());
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("已标记为已读");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireNotificationView(user);
        if (denied != null) return denied;
        notificationRepository.markAllAsRead(user.getId());
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("全部已标记为已读");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        CurrentUser user = requireUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireNotificationView(user);
        if (denied != null) return denied;
        if (!notificationRepository.delete(id, user.getId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "通知不存在"));
        }
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("通知删除成功");
        return ResponseEntity.ok(response);
    }

    private CurrentUser requireUser(String authorization) {
        return authSupport.parseBearerUser(authorization);
    }

    private ResponseEntity<ApiResponse<String>> requireNotificationView(CurrentUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "notification:view")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: notification:view is required"));
        }
        return null;
    }
}
