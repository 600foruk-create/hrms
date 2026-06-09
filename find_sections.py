import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# I will use string find to locate the sections.
# 1. Company Profile
idx_company = content.find('<!-- 1. Company Profile -->')
# 2. Grid Setting
idx_grid = content.find('<!-- 2. Grid Setting -->')
# 3. Admin Rights
idx_admin = content.find('<!-- 3. Admin Rights -->')
# 4. Email API
idx_email = content.find('<!-- 4. Email API -->')
# 5. WhatsApp API
idx_wa = content.find('<!-- 5. WhatsApp API -->')
# 6. Biometric
idx_bio = content.find('<!-- 6. Biometric -->')
# 7. Manager Rights
idx_manager = content.find('<!-- 7. Manager Rights -->')
# 8. System Settings
idx_system = content.find('<!-- 8. System Settings -->')

end_idx = content.find('<!-- Admin Reports Tab -->')

print(f"Company: {idx_company}")
print(f"Grid: {idx_grid}")
print(f"Admin: {idx_admin}")
print(f"Email: {idx_email}")
print(f"WhatsApp: {idx_wa}")
print(f"Bio: {idx_bio}")
print(f"Manager: {idx_manager}")
print(f"System: {idx_system}")
print(f"End: {end_idx}")

