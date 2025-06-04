import streamlit as st
import json
import re

def load_js_data(js_path):
    with open(js_path, encoding="utf-8") as f:
        content = f.read()
    # Entferne "const EINLAGEN_DATEN =" am Anfang und das Semikolon am Ende
    array_str = re.sub(r"^const EINLAGEN_DATEN\s*=\s*", "", content.strip())
    array_str = re.sub(r";\s*$", "", array_str)
    return json.loads(array_str)

EINLAGEN_DATEN = load_js_data("../einlagen.js")

st.set_page_config(page_title="Orthopädische Einlagenversorgung", layout="centered")

st.title("Orthopädische Einlagenversorgung")
st.write("Wählen Sie einen oder mehrere Befunde in der Seitenleiste aus, um eine Versorgungsvorschau zu erhalten. Es wird nur die Einlagenversorgung mit der höchsten Priorität angezeigt.")

# Entferne leere Befundnamen
befund_namen = sorted({item["befund"] for item in EINLAGEN_DATEN if item["befund"].strip()})

# Checkboxen in der Sidebar
selected_befunde = []
st.sidebar.write("Befunde auswählen")
for befund in befund_namen:
    if st.sidebar.checkbox(befund, key=befund):
        selected_befunde.append(befund)

selected_findings = [item for item in EINLAGEN_DATEN if item["befund"] in selected_befunde]

def get_highest_priority_finding(findings):
    if not findings:
        return None
    # Finde das Element mit dem höchsten Vorrang
    return max(findings, key=lambda x: x.get("vorrang", 0))

if selected_findings:
    # Diagnosen
    diagnosen = []
    for f in selected_findings:
        diagnosen.append((f.get("icd10", ""), f.get("befund", "")))
    diagnosen = sorted(set(diagnosen), key=lambda x: x[0])

    # Einlagenversorgung (nur höchste Priorität)
    highest_priority_finding = get_highest_priority_finding(selected_findings)
    einlagenversorgung = None
    if highest_priority_finding:
        einlagenversorgung = {
            "hmv": highest_priority_finding.get("hmv", ""),
            "einlage_typ": highest_priority_finding.get("einlage_typ", ""),
            "befund": highest_priority_finding.get("befund", "")
        }

    # Orthopädietechnische Erfordernisse
    technik = []
    for f in selected_findings:
        massnahme = f.get("massnahme", "")
        befund = f.get("befund", "")
        if massnahme:
            technik.append(f"{massnahme} ({befund})")

    st.markdown("### Versorgungsvorschau")
    # Formatierter Output
    result_str = "Diagnosen\n"
    for icd, befund in diagnosen:
        result_str += f"{icd} {befund}\n"
    result_str += "Einlagenversorgung\n"
    if einlagenversorgung:
        if einlagenversorgung["hmv"]:
            result_str += f"HMV: {einlagenversorgung['hmv']} "
        if einlagenversorgung["einlage_typ"]:
            result_str += f"{einlagenversorgung['einlage_typ']} "
        if einlagenversorgung["befund"]:
            result_str += f"Basierend auf: {einlagenversorgung['befund']}\n"
    result_str += "Orthopädietechnische Erfordernisse\n"
    for t in technik:
        result_str += f"{t}\n"

    st.code(result_str.strip(), language="text")

    st.warning(
        "Hinweis: Diese Anwendung stellt keinen medizinischen Rat dar. "
        "Die Versorgungsempfehlungen dienen ausschließlich der Information und dürfen nur von "
        "qualifizierten Leistungserbringern wie Orthopädietechnikern und Medizinern bewertet und umgesetzt werden."
        "Es wird keine Verantwortung für die Richtigkeit oder Vollständigkeit der bereitgestellten Informationen übernommen."

    )    
else:
    st.info("Bitte wählen Sie einen oder mehrere Befunde in der Seitenleiste aus.")