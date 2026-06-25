package com.oneflow.api.permission;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoleAccessTest {

    @Test
    void normalizesRoleNamesAndIds() {
        assertThat(RoleAccess.normalizeRoleId("admin")).isEqualTo("role-admin");
        assertThat(RoleAccess.normalizeRoleId("role-user")).isEqualTo("role-user");
        assertThat(RoleAccess.normalizeRoleName("role-developer")).isEqualTo("developer");
        assertThat(RoleAccess.normalizeRoleId("unknown")).isNull();
    }
}
