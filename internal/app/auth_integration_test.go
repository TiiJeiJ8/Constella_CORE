package app

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestRegisterLoginAndMe(t *testing.T) {
    r := SetupEngine()

    // Register
    regBody := `{"username":"testuser","email":"test@example.com","password":"secret123"}`
    req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(regBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusCreated {
        t.Fatalf("register failed: status=%d body=%s", w.Code, w.Body.String())
    }
    var regResp struct{ ID, Email, Username string }
    if err := json.Unmarshal(w.Body.Bytes(), &regResp); err != nil {
        t.Fatalf("invalid register response: %v", err)
    }

    // Login
    loginBody := `{"email":"test@example.com","password":"secret123"}`
    req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
    req.Header.Set("Content-Type", "application/json")
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK {
        t.Fatalf("login failed: status=%d body=%s", w.Code, w.Body.String())
    }
    var loginResp struct{ Token string }
    if err := json.Unmarshal(w.Body.Bytes(), &loginResp); err != nil {
        t.Fatalf("invalid login response: %v", err)
    }
    if loginResp.Token == "" {
        t.Fatalf("empty token in login response")
    }

    // Access protected /me
    req = httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
    req.Header.Set("Authorization", "Bearer "+loginResp.Token)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK {
        t.Fatalf("/me failed: status=%d body=%s", w.Code, w.Body.String())
    }
    var meResp struct{ UserID string `json:"userID"` }
    if err := json.Unmarshal(w.Body.Bytes(), &meResp); err != nil {
        t.Fatalf("invalid /me response: %v", err)
    }
    if meResp.UserID == "" {
        t.Fatalf("/me returned empty userID")
    }
}
