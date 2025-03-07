from g4f.client import Client
import sys
import asyncio
import urllib.parse

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

question = sys.argv[1]
file_path = 'resume.txt'

with open(file_path, 'r') as file:
    lines = file.readlines()
    file_content = ''.join(lines)

prompt= question + " // mon CV : " + file_content

client = Client()
response = client.chat.completions.create(
    model="gpt-4o-mini",
    provider = "OIVSCode Blackbox ChatGpt ChatGptEs DDG",
    messages=[{"role": "user", "content": prompt}],
    web_search=False
)
print(urllib.parse.quote(response.choices[0].message.content))