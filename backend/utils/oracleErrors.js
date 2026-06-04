function getErrorMessage(error) {
  return String(error?.message || error || '');
}

function isOraclePgaLimitError(error) {
  const message = getErrorMessage(error);
  return message.includes('ORA-04036');
}

function isOracleResourceExhaustedError(error) {
  const message = getErrorMessage(error);
  return isOraclePgaLimitError(message) || message.includes('ORA-00604');
}

function toOracleResourceResponse(error) {
  if (!isOracleResourceExhaustedError(error)) {
    return null;
  }

  return {
    status: 503,
    body: {
      success: false,
      message: 'Oracle数据库PGA内存已达到上限，请先释放数据库会话内存或调整PGA_AGGREGATE_LIMIT后重试',
      code: isOraclePgaLimitError(error) ? 'ORACLE_PGA_LIMIT_EXCEEDED' : 'ORACLE_RECURSIVE_SQL_ERROR'
    }
  };
}

module.exports = {
  getErrorMessage,
  isOraclePgaLimitError,
  isOracleResourceExhaustedError,
  toOracleResourceResponse
};
