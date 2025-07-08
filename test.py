from llama_cpp import Llama
import re

# 1) Initialize the model with your local GGUF path
llm = Llama(
    model_path=r"C:\Users\aurakcyber5\Downloads\tinyllama-1.1b-chat-v1.0.Q6_K.gguf",
    n_ctx=2048,
    verbose=False
)

def extract_skills(text: str):
    prompt = f"""
You are a skills-extraction assistant.
Read the following job description and output ONLY in single words.

Job Description:
\"\"\"
{text}
\"\"\"

Skills (comma-separated):"""

    out = llm(
        prompt=prompt,
        max_tokens=128,
        temperature=0.0,
    )
    raw = out["choices"][0]["text"]

    # strip any accidental “Skills:” or “Output:” prefixes
    cleaned = re.sub(r'^(Skills:|Output:)\s*', '', raw.strip(), flags=re.IGNORECASE)

    # split into a Python list
    skill_list = [s.strip() for s in cleaned.split(',') if s.strip()]
    return cleaned, skill_list

if __name__ == "__main__":
    description = (
        "This course covers reservoir characterization by pressure test analysis. Topics include fluid flow equations in porous media under transient and pseudo-steady state flow conditions, pressure buildup and pressure drawdown tests, average reservoir pressure, type curve matching, well testing of heterogeneous reservoirs, pressure derivatives analysis technique, multiple well testing, and test design and instrumentation."
    )

    skills_str, skills_list = extract_skills(description)
    print("Raw comma-string:", skills_str)
    print("As Python list:", skills_list)
