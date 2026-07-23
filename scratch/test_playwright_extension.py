import asyncio
import os
import shutil
from playwright.async_api import async_playwright

async def test_extension():
    print("Testing Playwright Chromium under Xvfb with NextPass Extension...")
    ext_path = "/home/fayber/projects/password-manager/extension/dist"
    user_data_dir = "/tmp/pw_e2e_nextpass"
    
    if os.path.exists(user_data_dir):
        shutil.rmtree(user_data_dir, ignore_errors=True)
        
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            args=[
                f"--disable-extensions-except={ext_path}",
                f"--load-extension={ext_path}",
                "--no-sandbox"
            ]
        )
        
        # Give service worker time to boot
        await asyncio.sleep(2)
        
        # Check background workers
        background_workers = context.service_workers
        print(f"Service workers running: {len(background_workers)}")
        for sw in background_workers:
            print(f" - SW URL: {sw.url}")
            
        await context.close()

if __name__ == "__main__":
    asyncio.run(test_extension())
