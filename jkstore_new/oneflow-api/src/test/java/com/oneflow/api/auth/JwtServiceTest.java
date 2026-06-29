package com.oneflow.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.oneflow.api.config.OneFlowProperties;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    @Test
    void tokenRoundTripKeepsPermissionsForAuthMe() {
        OneFlowProperties properties = new OneFlowProperties();
        properties.getJwt().setSecret("test-secret-for-jwt-service");
        properties.getJwt().setExpiresInSeconds(3600);
        JwtService jwtService = new JwtService(properties);

        CurrentUser user = new CurrentUser();
        user.setId("u-admin");
        user.setUsername("admin");
        user.setName("Admin");
        user.setRole("admin");
        user.setPermissions(Arrays.asList("requirement:view", "permission:manage"));

        CurrentUser parsed = jwtService.parse(jwtService.createToken(user));

        assertThat(parsed.getUsername()).isEqualTo("admin");
        assertThat(parsed.getPermissions()).containsExactly("requirement:view", "permission:manage");
    }
}
