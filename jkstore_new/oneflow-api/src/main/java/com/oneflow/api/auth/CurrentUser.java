package com.oneflow.api.auth;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CurrentUser {

    private String id;
    private String username;
    private String name;
    private String email;
    private String role;
    private List<String> permissions = new ArrayList<String>();

    public static CurrentUser ssoUser(String username) {
        CurrentUser user = new CurrentUser();
        user.setId(username);
        user.setUsername(username);
        user.setName(username);
        user.setRole("user");
        user.setPermissions(Collections.<String>emptyList());
        return user;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions == null ? new ArrayList<String>() : permissions;
    }
}
