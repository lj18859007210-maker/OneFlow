package com.oneflow.api.permission;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class RoleAccess {

    private static final Map<String, String> ROLE_ID_MAP;
    private static final Map<String, String> ROLE_NAME_MAP;

    static {
        Map<String, String> ids = new HashMap<String, String>();
        ids.put("admin", "role-admin");
        ids.put("user", "role-user");
        ids.put("developer", "role-developer");
        ROLE_ID_MAP = Collections.unmodifiableMap(ids);

        Map<String, String> names = new HashMap<String, String>();
        for (Map.Entry<String, String> entry : ids.entrySet()) {
            names.put(entry.getValue(), entry.getKey());
        }
        ROLE_NAME_MAP = Collections.unmodifiableMap(names);
    }

    private RoleAccess() {
    }

    public static String normalizeRoleId(String role) {
        if (role == null || role.trim().isEmpty()) {
            return null;
        }
        String trimmed = role.trim();
        if (trimmed.startsWith("role-")) {
            return ROLE_NAME_MAP.containsKey(trimmed) ? trimmed : null;
        }
        return ROLE_ID_MAP.get(trimmed);
    }

    public static String normalizeRoleName(String role) {
        if (role == null || role.trim().isEmpty()) {
            return null;
        }
        String trimmed = role.trim();
        if (ROLE_ID_MAP.containsKey(trimmed)) {
            return trimmed;
        }
        return ROLE_NAME_MAP.get(trimmed);
    }
}
