import base64
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from premailer import transform
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import mimetypes
import requests
from selenium import webdriver
from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import re
import json
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

load_dotenv()

# Gmail setup
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_APP_PASSWORD = os.getenv("SENDER_APP_PASSWORD")
# RECEIVER_EMAIL = "thenicsman@gmail.com"
RECEIVER_EMAIL = "shubham@roadvision.ai"
SUBJECT = "Daily Tenders"
HTML_FILE_PATH = "./output.html"
# HTML_FILE_PATH = "./final.html"

# Google drive setup
SCOPES = ['https://www.googleapis.com/auth/drive']
creds = None
GOOGLE_DRIVE_PARENT_FOLDER = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER")
base_url = "https://www.tenderdetail.com"
tdr_xpath = "/html/body/div/div[1]/section[2]/div[1]/div/div/table[1]/tbody/tr[2]/td[2]"

def send_html_email(soup: BeautifulSoup):
    """
    Reads an HTML file and sends it as the body of an email using Gmail's SMTP server.
    """
    print(f"Preparing to send email from {SENDER_EMAIL} to {RECEIVER_EMAIL}...")

    with open("./test.html", "w") as f:
        f.write(str(soup.prettify()))

    # Step 2: Construct the email message
    # We use MIMEMultipart because it's a flexible container for different parts of an email.
    message = MIMEMultipart("alternative")
    message["Subject"] = SUBJECT
    message["From"] = SENDER_EMAIL
    message["To"] = RECEIVER_EMAIL

    # Create the HTML part of the message. This is the crucial step.
    # By setting the subtype to 'html', we tell the client to render it.
    html_part = MIMEText(str(soup.prettify()), "html")

    # Attach the HTML part to the message
    message.attach(html_part)

    # Step 3: Connect to the SMTP server and send the email
    # The 'with' statement ensures the connection is automatically closed.
    try:
        # We are connecting to Gmail's SMTP server on port 587
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            # Puts the connection to the SMTP server into TLS (Transport Layer Security) mode.
            server.starttls() 
            
            # Log in to the server using your email and App Password
            server.login(SENDER_EMAIL, SENDER_APP_PASSWORD)
            
            # Send the email
            server.sendmail(
                SENDER_EMAIL, RECEIVER_EMAIL, message.as_string()
            )
        
        print(f"🎉 Email sent successfully to {RECEIVER_EMAIL}!")

    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication failed. Please check your email and App Password.")
        print("   - Make sure you are using a 16-character App Password, not your regular password.")
        print("   - Ensure 'Less secure app access' is not needed (App Passwords are the modern way).")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def authenticate_google_drive():
    """Authenticates with the Google Drive API and returns a service object."""
    creds = None
    # The file token.json stores the user's access and refresh tokens.
    # It's created automatically when the authorization flow completes for the first time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # This will open a browser window for you to log in and authorize the app.
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            
    try:
        service = build('drive', 'v3', credentials=creds)
        print("✅ Google Drive API Authentication Successful!")
        return service
    except HttpError as error:
        print(f"An error occurred during authentication: {error}")
        return None

def upload_folder_to_drive(service, local_folder_path, parent_folder_id=None):
    """Uploads a local folder and its contents to Google Drive."""
    folder_name = os.path.basename(local_folder_path)
    print(f"\nUploading folder '{folder_name}' to Google Drive...")
    
    # 1. Create the folder on Google Drive
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_folder_id:
        file_metadata['parents'] = [parent_folder_id]
        
    try:
        gdrive_folder = service.files().create(body=file_metadata, fields='id').execute()
        gdrive_folder_id = gdrive_folder.get('id')
        print(f"  - Created Google Drive folder with ID: {gdrive_folder_id}")

        # 2. Upload files into the created folder
        for item in os.listdir(local_folder_path):
            item_path = os.path.join(local_folder_path, item)
            if os.path.isfile(item_path):
                # Guess the MIME type of the file
                mimetype, _ = mimetypes.guess_type(item_path)
                file_metadata = {
                    'name': item,
                    'parents': [gdrive_folder_id]
                }
                media = MediaFileUpload(item_path, mimetype=mimetype)
                service.files().create(body=file_metadata, media_body=media, fields='id').execute()
                print(f"    - Uploaded file: {item}")
        
        return gdrive_folder_id
    except HttpError as error:
        print(f"An error occurred uploading the folder: {error}")
        return None

def get_shareable_link(service, folder_id):
    """Makes a folder public and returns its shareable link."""
    try:
        # Create a permission for anyone with the link to view
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        service.permissions().create(fileId=folder_id, body=permission).execute()
        
        # Get the webViewLink from the file's metadata
        result = service.files().get(fileId=folder_id, fields='webViewLink').execute()
        link = result.get('webViewLink')
        print(f"  - Generated shareable link: {link}")
        return link
    except HttpError as error:
        print(f"An error occurred while getting the shareable link: {error}")
        return None

def clean_project():
    # First lets clear the tenders/ directory
    os.system("rm -rf tenders/")
    # Create the tenders/ directory
    os.mkdir("tenders/")

def scrape_tenders(tenders_links_list, driver: WebDriver):
    for tender in tenders_links_list:
        tender_link = tender.find_all('a')[0]['href']
        driver.get(f"{base_url}{tender_link}")

        # Get the TDR
        tdr = driver.find_element(By.XPATH, value=tdr_xpath).text
        os.mkdir(f"tenders/{tdr}")

        # Get all a elements with the "Download" text
        download_links = driver.find_elements(By.XPATH, value='//a[contains(text(), "Download")]')

        print(f"Current TDR: {tdr}")
        print("Link: ", tender_link)

        # Download all the files
        for download_link in download_links:
            download_link_url = download_link.get_attribute("href")
            if not download_link_url:
                print("No download link found")
                continue
            file_name = download_link_url.split("FileName=")[-1]
            with open(f"tenders/{tdr}/{file_name}", "wb") as f:
                # If the file already exists, skip it
                print(f"Downloading {file_name}")
                f.write(requests.get(download_link_url).content)

        # Upload the folder to Google Drive
        drive_service = authenticate_google_drive()
        if not drive_service:
            return

        # Upload the folder to Google Drive, if it doesn't already exist
        folder_id = upload_folder_to_drive(drive_service, f"tenders/{tdr}", parent_folder_id=GOOGLE_DRIVE_PARENT_FOLDER)

        # Get the shareable link and print it
        shareable_link = get_shareable_link(drive_service, folder_id)
        print(f"Shareable link: {shareable_link}")

        # Add the shareable link to the tender
        tender.find_all('a')[0]['href'] = shareable_link

def fix_css_links(soup: BeautifulSoup):
    for link in soup.find_all('link', href=True):
        link['href'] = f"{base_url}{link['href']}"

def change_image_src(soup: BeautifulSoup):
    for img in soup.find_all('img'):
        img['src'] = f"https://wintersunset95.github.io/roadvisionlogo.jpg"

def remove_view_column(soup: BeautifulSoup):
    list_of_rows = soup.find_all('tr')
    # for every row in the table, remove the third column
    for row in list_of_rows:
        row.find_all('td')[2].decompose()

def insert_drive_links(soup: BeautifulSoup):
    soup2 = BeautifulSoup(open("./final.html"), 'html.parser')
    soup1_tenders_links = soup.find_all('p', attrs={'class': 'm-td-brief-link'})
    soup2_tenders_links = soup2.find_all('p', attrs={'class': 'm-td-brief-link'})

    # Replace the links in soup1 with the google drive links in soup2
    # Iterate through both lists at the same time
    for tender1, tender2 in zip(soup1_tenders_links, soup2_tenders_links):
        tender1.find_all('a')[0]['href'] = tender2.find_all('a')[0]['href']

def apply_multi_column_table_layout(soup, container_element, align_last_right=False):
    """
    Takes a container element and rearranges its direct children into a table
    with evenly spaced columns. This is the email-safe way to create a
    multi-item, evenly-spaced layout.

    Args:
        soup (BeautifulSoup): The main soup object.
        container_element (Tag): The parent element whose children will be arranged.
        align_last_right (bool): If True, aligns the last item to the right, mimicking
                                space-between for 2+ items.
    """
    # Find all direct children to be arranged. 'recursive=False' is key here.
    children = container_element.find_all(recursive=False)
    
    # If there's nothing to do, just exit.
    if not children:
        return

    num_children = len(children)
    # Calculate the percentage width for each column.
    col_width = int(100 / num_children)

    # --- Create the new table structure ---
    table = soup.new_tag('table', width="100%", border="0", cellpadding="0", cellspacing="0")
    tr = soup.new_tag('tr')
    table.append(tr)

    print(f"Applying {num_children}-column table layout...")

    # --- Loop through each child and create a cell for it ---
    for i, child in enumerate(children):
        # Base style for all cells
        style = f"width: {col_width}%; vertical-align: top;"

        # Add specific text alignment
        if align_last_right and num_children > 1:
            if i == 0:
                style += " text-align: left;"  # First item
            elif i == num_children - 1:
                style += " text-align: right;" # Last item
            else:
                style += " text-align: center;" # Middle items
        else:
            style += " text-align: left;" # Default alignment for all

        # Create the table cell (td) with the calculated style
        td = soup.new_tag('td', style=style)
        
        # .extract() removes the child from its original location
        td.append(child.extract())
        
        # Add the new cell to our table row
        tr.append(td)

    # --- Finalize the container ---
    # Clear out any old inline styles (like display:flex)
    container_element.attrs.pop('style', None)
    
    # Add the newly created table into the now-empty container
    container_element.append(table)

def reformat_page(soup: BeautifulSoup) -> BeautifulSoup:
    """
    Refactors an entire HTML page (as a BeautifulSoup object) to use email-safe
    table layouts instead of CSS Flexbox.
    """
    print("🚀 Starting HTML reformatting for email compatibility...")

    # --- Section 1: Image Header ---
    img_element = soup.find('img')
    if img_element:
        # Set email-safe image styles
        img_element.attrs['style'] = "width:100px; height:auto; display:block;"
        # The container is two levels above the image
        img_parent_container = img_element.parent.parent
        if img_parent_container:
            print("Applying table layout to image header...")
            apply_multi_column_table_layout(soup, img_parent_container, align_last_right=True)

    # --- Section 2: Owner Name ---
    owner = soup.find('p', attrs={'class': 'm-owner-name'})
    if owner:
        # The container is two levels above the owner p tag
        owner_parent_container = owner.parent.parent
        if owner_parent_container:
            print("Applying table layout to owner section...")
            apply_multi_column_table_layout(soup, owner_parent_container, align_last_right=True)

    # --- Section 3: Main Transaction Rows ---
    mainTR_list = soup.find_all('div', attrs={'class': 'm-mainTR'})
    for mainTR in mainTR_list:
        rows = mainTR.find_all('div', attrs={'class': 'row'})
        
        # Handle the specific case for company and place in the first row
        if len(rows) >= 1:
            row1 = rows[0]
            company = row1.find('div', attrs={'class': 'col-md-8'})
            place = row1.find('div', attrs={'class': 'col-md-4'})

            if company and place:
                print("Applying specific 2-column table to company/place row...")
                # This logic is already a perfect 2-column table, so we keep it.
                table = soup.new_tag('table', width="100%", border="0", cellpadding="0", cellspacing="0", role="presentation")
                tr = soup.new_tag('tr')
                table.append(tr)
                td_left = soup.new_tag('td', style="width: 50%; text-align: left; vertical-align: top;")
                td_left.append(company.extract())
                tr.append(td_left)
                td_right = soup.new_tag('td', style="width: 50%; text-align: right; vertical-align: top;")
                td_right.append(place.extract())
                tr.append(td_right)
                row1.insert(0, table)

        # Handle any other rows that need a general multi-column layout
        if len(rows) >= 2:
            row2 = rows[1]
            print("Applying table layout to the second row...")
            apply_multi_column_table_layout(soup, row2, align_last_right=True)
            
    print("✅ HTML reformatting complete.")
    return soup

def main():
    link = "https://www.tenderdetail.com/dailytenders/47136136/7c7651b5-98f3-4956-9404-913de95abb79"

    # driver = webdriver.Chrome()
    # driver.get(link)

    # Get page source from selenium
    # page = driver.page_source
    page = requests.get(link).content

    soup = BeautifulSoup(page, 'html.parser')

    # First lets do some search and replace
    owner_name = soup.find('p', attrs={'class': 'm-owner-name'})
    company_name = soup.find('p', attrs={'class': 'm-company-name'})
    support = soup.find_all('p', attrs={'class': 'm-r-date'})[1]
    if owner_name and company_name and support:
        owner_name.string = "Shubham Kanojia"
        company_name.string = "RoadVision AI Pvt. Ltd."
        support.string = "For customer support: (+91) 8115366981"

    tenders_links_list = soup.find_all('p', attrs={'class': 'm-td-brief-link'})
    remove_view_column(soup)
    # The following function should be commented if scrape_tenders is uncommented
    insert_drive_links(soup)
    # clean_project()
    # scrape_tenders(tenders_links_list, driver)
    change_image_src(soup)
    fix_css_links(soup)

    # Export the soup to a html file
    with open("output.html", "w") as f:
        f.write(str(soup.prettify()))

    final_html = transform(soup.prettify())
    final_html_soup = BeautifulSoup(final_html, 'html.parser')
    reformat_page(final_html_soup)
    # Export the final html to a html file
    with open("final.html", "w") as f:
        f.write(final_html_soup.prettify())

    send_html_email(final_html_soup)

main()
