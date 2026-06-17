package com.oneflow.api.platform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Repository
public class PlatformRepository {

    private static final String PLATFORM_LIST_KEY = "requirement.platforms";
    private static final List<Map<String, Object>> DEFAULT_PLATFORMS = defaultPlatforms();

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PlatformRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> findPlatforms() {
        String stored = findSettingValue(PLATFORM_LIST_KEY);
        if (!StringUtils.hasText(stored)) {
            return DEFAULT_PLATFORMS;
        }
        try {
            return normalizePlatforms(objectMapper.readValue(stored, new TypeReference<List<Object>>() {}));
        } catch (Exception ex) {
            // 配置内容被人工改坏时沿用旧 Node 兜底策略：不让页面崩溃，返回默认平台分组。
            return DEFAULT_PLATFORMS;
        }
    }

    @Transactional
    public List<Map<String, Object>> updatePlatforms(Object platforms) {
        List<Map<String, Object>> normalized = normalizePlatforms(platforms);
        setSettingValue(PLATFORM_LIST_KEY, toJson(normalized));
        return normalized;
    }

    private String findSettingValue(String key) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT settingValue FROM system_settings WHERE settingKey = ?",
                    String.class,
                    key);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    private void setSettingValue(String key, String value) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_settings WHERE settingKey = ?",
                Integer.class,
                key);
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "UPDATE system_settings SET settingValue = ?, updatedAt = CURRENT_TIMESTAMP WHERE settingKey = ?",
                    value,
                    key);
            return;
        }
        jdbcTemplate.update(
                "INSERT INTO system_settings (id, settingKey, settingValue, createdAt, updatedAt) "
                        + "VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                UUID.randomUUID().toString(),
                key,
                value);
    }

    private List<Map<String, Object>> normalizePlatforms(Object platforms) {
        if (!(platforms instanceof List)) {
            throw new IllegalArgumentException("platforms must be an array");
        }
        List<?> items = (List<?>) platforms;
        boolean legacyList = true;
        for (Object item : items) {
            if (item instanceof Map) {
                legacyList = false;
                break;
            }
        }
        if (legacyList) {
            return normalizeLegacyPlatformList(items);
        }

        Set<String> seenGroups = new LinkedHashSet<String>();
        List<Map<String, Object>> normalized = new ArrayList<Map<String, Object>>();
        for (Object item : items) {
            if (!(item instanceof Map)) {
                continue;
            }
            Map<?, ?> group = (Map<?, ?>) item;
            String name = text(group.get("name"));
            if (!StringUtils.hasText(name) || seenGroups.contains(name)) {
                continue;
            }
            seenGroups.add(name);

            List<String> children = normalizeChildren(group.get("children"));
            Map<String, Object> result = new LinkedHashMap<String, Object>();
            result.put("name", name);
            result.put("children", children);
            normalized.add(result);
        }
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("至少保留一个平台");
        }
        return normalized;
    }

    private List<Map<String, Object>> normalizeLegacyPlatformList(List<?> platforms) {
        List<String> children = normalizeChildren(platforms);
        if (children.isEmpty()) {
            throw new IllegalArgumentException("至少保留一个平台");
        }
        Map<String, Object> group = new LinkedHashMap<String, Object>();
        group.put("name", "默认平台");
        group.put("children", children);
        return Arrays.asList(group);
    }

    private List<String> normalizeChildren(Object value) {
        List<?> children = value instanceof List ? (List<?>) value : new ArrayList<Object>();
        Set<String> seen = new LinkedHashSet<String>();
        for (Object child : children) {
            String name = normalizePlatformName(child);
            if (StringUtils.hasText(name)) {
                seen.add(name);
            }
        }
        return new ArrayList<String>(seen);
    }

    private String normalizePlatformName(Object value) {
        if (value instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) value;
            String byName = text(map.get("name"));
            if (StringUtils.hasText(byName)) return byName;
            String byLabel = text(map.get("label"));
            if (StringUtils.hasText(byLabel)) return byLabel;
            return text(map.get("value"));
        }
        return text(value);
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("平台配置序列化失败", ex);
        }
    }

    private static List<Map<String, Object>> defaultPlatforms() {
        Map<String, Object> group = new LinkedHashMap<String, Object>();
        group.put("name", "默认平台");
        group.put("children", Arrays.asList("CRM 系统", "BOSS 系统", "OA 办公系统", "网管支撑平台", "大数据分析平台", "掌上移动 APP"));
        return Arrays.asList(group);
    }
}
