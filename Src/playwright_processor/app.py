from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        # Launch the browser (default is chromium)
        browser = p.chromium.launch(headless=False)  # Set headless=True if you don't want to see the browser
        page = browser.new_page()
        
        try:
            # 1. Go to the website
            page.goto('https://news.ycombinator.com', timeout=10000)
            print("Navigated to Hacker News homepage")
            
            # 2. Click on the jobs tab
            # The jobs link has href="jobs" - we'll wait for it to be visible
            page.wait_for_selector('a[href="jobs"]', timeout=5000)
            page.click('a[href="jobs"]')
            print("Clicked on Jobs tab")
            
            # Wait for jobs page to load
            time.sleep(2)  # Adding small delay to ensure page loads
            
            # 3. Click the first job option
            # The job listings are in elements with class "athing"
            page.wait_for_selector('.athing .titleline a', timeout=5000)
            first_job = page.query_selector('.athing .titleline a')
            if first_job:
                first_job.click()
                print("Clicked on first job listing")
            else:
                raise Exception("No job listings found")
            
            # Wait for job page to load (might be external site)
            time.sleep(3)
            
            # 4. Take a screenshot
            screenshot_path = 'hackernews_job_application.png'
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")
            
        except Exception as e:
            print(f"An error occurred: {str(e)}")
            # Take screenshot of error state
            page.screenshot(path='error_state.png')
        
        # 6. Close browser
        browser.close()
        print("Browser closed")

if __name__ == "__main__":
    main()