import asyncio
import os
import shutil
from playwright.async_api import async_playwright

TEST_SITES = [
    {"name": "GitHub Login", "url": "https://github.com/login"},
    {"name": "Hacker News Login", "url": "https://news.ycombinator.com/login"},
    {"name": "Wikipedia Login", "url": "https://en.wikipedia.org/w/index.php?title=Special:UserLogin"},
    {"name": "GitLab Sign-In", "url": "https://gitlab.com/users/sign_in"},
    {"name": "Atlassian / Bitbucket Login", "url": "https://id.atlassian.com/login"},
    {"name": "Shopify Login", "url": "https://accounts.shopify.com/lookup"},
    {"name": "DigitalOcean Login", "url": "https://cloud.digitalocean.com/login"},
    {"name": "Hetzner Login", "url": "https://accounts.hetzner.com/login"},
    {"name": "WordPress Support Login", "url": "https://wordpress.org/support/users/login.php"},
    {"name": "Amazon Sign-In", "url": "https://www.amazon.com/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com%2F%3Fref_%3Dnav_custrec_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=usflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0"},
]

async def test_real_sites():
    print("==========================================================")
    print("   NextPass Real-World Site Form Compatibility Testing    ")
    print("==========================================================")
    
    ext_path = "/home/fayber/projects/password-manager/extension/dist"
    user_data_dir = "/tmp/pw_e2e_real_sites_v3"
    
    if os.path.exists(user_data_dir):
        shutil.rmtree(user_data_dir, ignore_errors=True)
        
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            args=[
                f"--disable-extensions-except={ext_path}",
                f"--load-extension={ext_path}",
                "--no-sandbox",
                "--disable-gpu"
            ]
        )
        
        page = await context.new_page()
        results = []
        
        for site in TEST_SITES:
            print(f"\n[Testing] {site['name']} ({site['url']})...")
            try:
                await page.goto(site['url'], wait_until="networkidle", timeout=15000)
            except Exception:
                pass
                
            await asyncio.sleep(2)
            
            try:
                pw_count = 0
                user_count = 0
                
                for frame in page.frames:
                    pws = await frame.query_selector_all('input[type="password"]')
                    for p_el in pws:
                        if await p_el.is_visible():
                            pw_count += 1
                            
                    users = await frame.query_selector_all('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="checkbox"])')
                    for u_el in users:
                        if await u_el.is_visible():
                            user_count += 1
                            
                detected = pw_count > 0 or user_count > 0
                results.append({
                    "site": site['name'],
                    "pw_count": pw_count,
                    "user_count": user_count,
                    "detected": detected
                })
                print(f"  └─ Password Fields: {pw_count}, Username/Input Fields: {user_count} -> Detected: {detected}")
            except Exception as e:
                print(f"  └─ Error inspecting form: {e}")
                results.append({"site": site['name'], "error": str(e), "detected": False})
                
        await context.close()
        
        print("\n==========================================================")
        print("                  FINAL TEST SUMMARY                       ")
        print("==========================================================")
        passed = sum(1 for r in results if r.get("detected"))
        total = len(results)
        print(f"Result: {passed}/{total} Real-World Sites Form Detected")
        for r in results:
            sym = "✅" if r.get("detected") else "❌"
            print(f"{sym} {r['site']}: User Fields={r.get('user_count', 0)}, PW Fields={r.get('pw_count', 0)}")

if __name__ == "__main__":
    asyncio.run(test_real_sites())
