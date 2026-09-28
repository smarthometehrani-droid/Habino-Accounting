import os
import urllib.request
import json

# خواندن کلید از متغیرهای محیطی سیستم
api_key = os.getenv("BAZAARLINK_API_KEY")

if not api_key:
    print("❌ خطا: متغیر BAZAARLINK_API_KEY یافت نشد! لطفا VS Code را کاملاً ریستارت کنید.")
else:
    print(f"✅ کلید شناسایی شد: {api_key[:10]}...******")
    
    # ارسال یک درخواست تست ساده به اندپوینت Bazaarlink
    url = "https://api.bazaarlink.ai/v1/models" # آدرس اندپوینت لیست مدل‌ها
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("🚀 اتصال به Bazaarlink با موفقیت برقرار شد!")
    except Exception as e:
        print(f"⚠️ کلید شناسایی شد اما در اتصال خطایی رخ داد: {e}")