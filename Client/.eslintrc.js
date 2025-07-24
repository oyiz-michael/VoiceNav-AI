module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true, // For config files
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script', // Changed from 'module' to handle non-module JS
  },
  rules: {
    // Code quality rules
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console for debugging
    'no-debugger': 'warn',
    
    // Style rules - Let prettier handle formatting
    'indent': 'off', // Let prettier handle indentation
    'quotes': ['error', 'double'], // Changed to double quotes to match current code
    'semi': ['error', 'always'],
    'comma-dangle': 'off', // Allow trailing commas
    
    // Best practices
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-var': 'off', // Allow var for compatibility
    'prefer-const': 'warn', // Warn instead of error
    'prefer-arrow-callback': 'warn', // Warn instead of error
    
    // Browser-specific
    'no-undef': 'error'
  },
  globals: {
    // Browser globals
    'window': 'readonly',
    'document': 'readonly',
    'console': 'readonly',
    'navigator': 'readonly',
    'localStorage': 'readonly',
    'fetch': 'readonly',
    'WebSocket': 'readonly',
    'MediaRecorder': 'readonly',
    'Blob': 'readonly',
    'URL': 'readonly',
    'File': 'readonly',
    'FileReader': 'readonly',
    
    // AWS SDK globals (if used)
    'AWS': 'readonly',
    
    // Config variables from config.js
    'PREFIX': 'readonly',
    'BUCKET': 'readonly',
    'REGION': 'readonly',
    'WS_ENDPOINT': 'readonly',
    
    // Node.js globals (for config files)
    'module': 'writable',
    'exports': 'writable',
    'require': 'readonly'
  }
};
