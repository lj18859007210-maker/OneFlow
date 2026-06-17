package com.oneflow.api.health;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        Map<String, String> response = new LinkedHashMap<String, String>();
        response.put("status", "ok");
        response.put("message", "OneFlow backend is running");
        return response;
    }
}
