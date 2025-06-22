from playwright.sync_api import sync_playwright
import time

def book_appointment():
    with sync_playwright() as p:
        # Launch browser (not headless so we can see what's happening)
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            # Navigate to the website
            page.goto("https://exhalespaeast.co.uk/", timeout=60000)
            print("Opened exhalespaeast.co.uk")
            
            # Scroll down to the contact section
            contact_link = page.locator('a[href="#contact"]')
            contact_link.click()
            print("Scrolled to contact section")
            
            # Wait for contact form to be visible
            page.wait_for_selector('.wpcf7-form', state='visible')
            
            # Fill out the form
            page.fill('input[name="your-name"]', 'William')
            page.fill('input[name="your-email"]', 'test@gmail.com')
            page.fill('input[name="your-tel"]', '1234567890')  # Adding phone number as it might be required
            page.fill('textarea[name="your-message"]', 'I would like to book the next available appointment')
            
            print("Filled out the form")
            
            # Submit the form
            submit_button = page.locator('input[type="submit"]')
            submit_button.click()
            print("Submitted the form")
            
            # Wait for confirmation or next steps
            time.sleep(5)  # Give time to see the result
            
            print("Appointment request submitted successfully!")
            
        except Exception as e:
            print(f"An error occurred: {e}")
            
        finally:
            # Keep browser open for a while to see the result
            input("Press Enter to close the browser...")
            browser.close()

if __name__ == "__main__":
    book_appointment()