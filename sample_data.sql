-- Sample Data for Car Detailing Studio
-- Run this AFTER importing database_setup_safe.sql

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, role, first_name, last_name, phone) VALUES 
('admin', 'admin@cardetailing.com', '$2a$10$b6KJo3t/i8.UGJJTNEUPFeYoDv5mNqvree2G9k3IRLDTCjbk1PATO', 'admin', 'Admin', 'User', '9876543210');

-- Insert default system settings
INSERT INTO system_settings (id, business_name, business_email, business_phone, business_address, website, logo_url, theme_colors) VALUES 
(1, 'Car Detailing Studio', 'info@cardetailing.com', '9876543210', '123 Main Street, City, State 12345', 'www.cardetailing.com', NULL, '{"primary": "#3B82F6", "secondary": "#6B7280"}');

-- Insert sample service categories
INSERT INTO service_categories (name, description) VALUES 
('Wash', 'Basic car washing services'),
('Detailing', 'Comprehensive car detailing services'),
('Coating', 'Protective coating services'),
('PPF', 'Paint Protection Film services');

-- Insert sample services
INSERT INTO services (category_id, name, description, base_price, duration_minutes) VALUES 
(1, 'Basic Car Wash', 'Exterior wash and interior cleaning', 500.00, 60),
(1, 'Premium Wash', 'Exterior wash, interior cleaning, and tire dressing', 800.00, 90),
(2, 'Interior Detailing', 'Complete interior cleaning and sanitization', 1200.00, 120),
(2, 'Exterior Detailing', 'Complete exterior detailing with waxing', 1500.00, 150),
(3, 'Ceramic Coating', 'Long-lasting ceramic protection', 5000.00, 240),
(4, 'PPF Installation', 'Paint Protection Film installation', 8000.00, 360);

-- Insert sample service packages
INSERT INTO service_packages (name, description, price) VALUES 
('Starter Package', 'Basic wash + interior cleaning', 800.00),
('Premium Package', 'Complete detailing + ceramic coating', 6000.00);

-- Insert sample customers
INSERT INTO customers (first_name, last_name, email, phone, address, city) VALUES 
('John', 'Doe', 'john.doe@email.com', '9876543210', '123 Main St', 'Mumbai'),
('Jane', 'Smith', 'jane.smith@email.com', '9876543211', '456 Oak Ave', 'Delhi'),
('Mike', 'Johnson', 'mike.johnson@email.com', '9876543212', '789 Pine Rd', 'Bangalore');

-- Insert sample vehicles
INSERT INTO vehicles (customer_id, vehicle_number, vehicle_type, brand, model, year, color, registration_number) VALUES 
(1, 'MH01AB1234', 'sedan', 'Honda', 'City', 2020, 'White', 'MH01AB1234'),
(2, 'DL02CD5678', 'suv', 'Toyota', 'Fortuner', 2021, 'Black', 'DL02CD5678'),
(3, 'KA03EF9012', 'hatchback', 'Maruti', 'Swift', 2019, 'Red', 'KA03EF9012');
