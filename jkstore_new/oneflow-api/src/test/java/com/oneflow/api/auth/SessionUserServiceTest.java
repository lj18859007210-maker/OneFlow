package com.oneflow.api.auth;

import com.oneflow.api.permission.PermissionRepository;
import com.oneflow.api.user.UserRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SessionUserServiceTest {

    @Test
    void buildAddsBaseDeveloperPermissionsWhenRolePermissionRowsAreMissing() {
        PermissionRepository permissionRepository = mock(PermissionRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(permissionRepository.findCodesByRole("developer")).thenReturn(new ArrayList<String>());

        SessionUserService service = new SessionUserService(userRepository, permissionRepository);
        CurrentUser user = service.build(userRow("developer"));

        assertThat(user.getPermissions()).contains("requirement:view");
    }

    @Test
    void loginAcceptsNodeBcrypt2bHash() {
        PermissionRepository permissionRepository = mock(PermissionRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(permissionRepository.findCodesByRole(anyString())).thenReturn(new ArrayList<String>());

        Map<String, Object> row = userRow("admin");
        row.put("password", "$2b$10$DVcgFnGEMHfyFgm8HIWMT.INaxeWx8VlLSDjSWIhVmw92C0ScFyga");
        when(userRepository.findActiveByUsername("admin")).thenReturn(row);

        SessionUserService service = new SessionUserService(userRepository, permissionRepository);

        assertThat(service.login("admin", "admin")).isNotNull();
    }

    private Map<String, Object> userRow(String role) {
        Map<String, Object> row = new HashMap<String, Object>();
        row.put("id", "u-dev");
        row.put("username", "developer-user");
        row.put("name", "Developer User");
        row.put("email", "developer@example.com");
        row.put("role", role);
        return row;
    }
}
