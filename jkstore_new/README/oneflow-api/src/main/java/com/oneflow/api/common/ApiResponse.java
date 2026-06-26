package com.oneflow.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private String updatetime;
    private Integer code;
    private Boolean success;
    private T data;
    private String message;

    public static <T> ApiResponse<T> legacy(int code, T data) {
        ApiResponse<T> response = new ApiResponse<T>();
        response.setUpdatetime(TimeFormats.currentUpdateTime());
        response.setCode(code);
        response.setData(data);
        return response;
    }

    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> response = legacy(0, data);
        response.setSuccess(true);
        return response;
    }

    public static <T> ApiResponse<T> failure(int code, String message) {
        ApiResponse<T> response = new ApiResponse<T>();
        response.setUpdatetime(TimeFormats.currentUpdateTime());
        response.setCode(code);
        response.setSuccess(false);
        response.setMessage(message);
        return response;
    }

    public String getUpdatetime() {
        return updatetime;
    }

    public void setUpdatetime(String updatetime) {
        this.updatetime = updatetime;
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public Boolean getSuccess() {
        return success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
