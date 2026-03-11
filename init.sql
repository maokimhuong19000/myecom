-- Create both databases
CREATE DATABASE IF NOT EXISTS ecom_auth;
CREATE DATABASE IF NOT EXISTS ecom_products;

-- Grant root access to both
GRANT ALL PRIVILEGES ON ecom_auth.* TO 'root'@'%';
GRANT ALL PRIVILEGES ON ecom_products.* TO 'root'@'%';
FLUSH PRIVILEGES;


-- | `http://localhost` | POS Register (default) |
-- | `http://localhost/admin/products` | Product management |
-- | `http://localhost/admin/inventory` | Stock adjust + audit trail |
-- | `http://localhost/admin/inventory/alerts` | Low stock dashboard |
-- | `http://localhost/admin/analytics` | Sales & profit charts |
-- | `http://localhost:8000/docs` | Auth API docs (Swagger) |
-- | `http://localhost:8001/docs` | Product API docs (Swagger) |
