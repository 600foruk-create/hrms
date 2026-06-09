import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

s2 = content.find('<!-- 2. Grid Setting -->')
s3 = content.find('<!-- 3. Admin Rights -->')
s4 = content.find('<!-- 4. Email API -->')
s5 = content.find('<!-- 5. Whatsapp API -->')
s6 = content.find('<!-- 6. Bio Metric Machine -->')
s7 = content.find('<!-- 7. Manager Rights -->')
s8 = content.find('<!-- 8. System Settings (Task Weights & Audit Log) -->')
s_end = content.find('<!-- ==================== MANAGER VIEW ==================== -->')

# The end of the admin-view is where manager-view starts minus some closing divs.
# Let's just find the end of s8 properly. It should end with a closing div for settings-content-system-settings.

if any(x == -1 for x in [s2,s3,s4,s5,s6,s7,s8,s_end]):
    print("Failed to find some sections.")
    sys.exit(1)

# Extract blocks
block_grid = content[s2:s3]
block_admin = content[s3:s4]
block_email = content[s4:s5]
block_whatsapp = content[s5:s6]
block_bio = content[s6:s7]
block_manager = content[s7:s8]
block_system = content[s8:s_end]

# Now, we need to extract the inner content of grid setting, omitting its outer container if we want, or just change its ID.
# Actually, the user wants "grid setting b is men rakh den yane genral seting men".
# So inside "General Settings", we put Grid Setting and System Setting.

new_html = f'''

                        <!-- 2. General Settings (Replaces Grid & System Settings) -->
                        <div id="settings-content-general-settings" class="settings-sub-tab-content hidden" style="max-height: calc(100vh - 180px); overflow-y: auto; padding-right: 10px;">
                            <div class="row">
                                <div class="col-12 mb-4">
                                    <div class="section-card bg-glass">
                                        <h3>Theme & Grid Settings</h3>
                                        <p class="text-secondary mb-4">Customize the visual appearance of your dashboard.</p>
                                        
                                        <!-- Keep the inner content of Grid setting -->
                                        {''.join(block_grid.split('<!-- 2. Grid Setting -->')[1].split('<div id="settings-content-grid-setting"')[1].split('>', 1)[1].rsplit('</div>', 1)[0])}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-12">
                                    <!-- Keep the inner content of System Settings -->
                                    {''.join(block_system.split('<!-- 8. System Settings (Task Weights & Audit Log) -->')[1].split('<div id="settings-content-system-settings"')[1].split('>', 1)[1].rsplit('</div>', 3)[0])}
                                </div>
                            </div>
                        </div>

                        <!-- 3. APIs / IP Configuration -->
                        <div id="settings-content-api-ip-config" class="settings-sub-tab-content hidden" style="max-height: calc(100vh - 180px); overflow-y: auto; padding-right: 10px;">
                            <div class="row">
                                <div class="col-12 mb-4">
                                    {''.join(block_email.split('<!-- 4. Email API -->')[1].split('<div id="settings-content-email-api"')[1].split('>', 1)[1].rsplit('</div>', 1)[0])}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12 mb-4">
                                    {''.join(block_whatsapp.split('<!-- 5. Whatsapp API -->')[1].split('<div id="settings-content-whatsapp-api"')[1].split('>', 1)[1].rsplit('</div>', 1)[0])}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12 mb-4">
                                    {''.join(block_bio.split('<!-- 6. Bio Metric Machine -->')[1].split('<div id="settings-content-biometric"')[1].split('>', 1)[1].rsplit('</div>', 1)[0])}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
'''

final_content = content[:s2] + new_html + content[s_end:]

with open('index_new.html', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("HTML Replaced Successfully!")
