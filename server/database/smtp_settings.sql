-- SMTP Settings Table
CREATE TABLE IF NOT EXISTS smtp_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_pass VARCHAR(255) NOT NULL,
  smtp_secure BOOLEAN DEFAULT FALSE,
  from_name VARCHAR(255) DEFAULT 'Car Detailing Studio',
  from_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default SMTP settings
INSERT INTO smtp_settings (smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, from_name, from_email, is_active) 
VALUES ('smtp.hostinger.com', 465, 'info@wtechnology.in', 'Admin@6706', TRUE, 'Car Detailing Studio - W Technology', 'info@wtechnology.in', TRUE)
ON DUPLICATE KEY UPDATE 
  smtp_host = VALUES(smtp_host),
  smtp_port = VALUES(smtp_port),
  smtp_user = VALUES(smtp_user),
  smtp_pass = VALUES(smtp_pass),
  smtp_secure = VALUES(smtp_secure),
  from_name = VALUES(from_name),
  from_email = VALUES(from_email),
  is_active = VALUES(is_active);
