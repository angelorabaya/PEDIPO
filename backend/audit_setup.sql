-- Create the audit_logs table
CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    username NVARCHAR(50) NULL,
    action NVARCHAR(50) NOT NULL,
    entity_type NVARCHAR(50) NOT NULL,
    entity_id INT NULL,
    old_values NVARCHAR(MAX) NULL,
    new_values NVARCHAR(MAX) NULL,
    ip_address NVARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for common queries (filtering by user, entity type, and entity ID)
CREATE INDEX IX_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IX_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IX_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IX_audit_logs_created_at ON audit_logs(created_at DESC);
