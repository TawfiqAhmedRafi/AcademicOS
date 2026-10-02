"""
Rule-based topic tags (no ML).  You write the keywords once; every item gets
domain + technique tags.  Used for filters, badges and thesis topic browsing.
Edit the dictionaries freely - they are plain regexes on lowercase text.
"""
import re

PROJECT_DOMAINS = {
    "IoT & Embedded":     r"\biot\b|esp-?32|arduino|microcontroller|raspberry|sensor|lora|gsm|rfid|nodemcu|embedded",
    "Web & Software":     r"web[\s-]?(?:based|app|site|portal|platform)|portal|full[\s-]?stack|mern|react|node\.?js|website|dashboard|marketplace|management system",
    "Machine Learning":   r"machine learning|deep learning|neural|\bcnn\b|\bml\b|\bai\b|classif|predict|recogni[sz]",
    "Robotics & Control": r"robot|rover|motor|servo|line[\s-]?follow|drone|autonomous|actuator|wheelchair",
    "Power & Energy":     r"solar|battery|inverter|power (?:supply|factor|monitor)|energy|voltage|grid|charging|electrical",
    "Communication & RF": r"\brf\b|antenna|wireless|lora|bluetooth|wi-?fi|radio|communication|signal|modulation",
    "Healthcare":         r"health|patient|medical|blood|heart|ecg|hospital|disease|wheelchair|donor",
    "Security & Safety":  r"security|surveillance|safety|alarm|theft|fire|gas leak|emergency|intrusion|lock",
    "Agriculture":        r"agri|crop|farm|irrigation|soil|plough|seed|plant",
    "Education":          r"student|attendance|academic|course|university|classroom|exam|alumni|obe",
}

THESIS_DOMAINS = {
    "Medical / Health AI":        r"cancer|leukemia|malaria|tumou?r|fracture|x-?ray|skin|lesion|autism|disease|diagnos|medical|clinical|pox|retina|ecg|covid|blood cell|health|obesity",
    "Agriculture AI":             r"rice|leaf|crop|plant|fruit|agricultur|paddy|wheat|jute",
    "Computer Vision":            r"image|yolo|detection|segmentation|classification|vision|video|recognition|super-?resolution",
    "NLP & Language":             r"language|transformer|nlp|bangla|text|speech|question answering|sentiment|translation|chatbot|llm",
    "Antenna / RF":               r"antenna|microstrip|patch|\brf\b|microwave|5g|6g|mimo|rectenna",
    "Photonics / Metamaterial":   r"metamaterial|metasurface|absorber|terahertz|thz|photonic|fiber|waveguide|plasmon|infrared|bic|optical|liquid crystal|sensor",
    "Solar / Energy":             r"solar|photovoltaic|perovskite|scaps|mppt|battery|energy|cell",
    "Power Electronics / Grid":   r"inverter|converter|microgrid|dc-dc|power loss|switching|sliding mode|grid|motor drive|transient|boost",
    "Signal Processing / Comms":  r"channel|ofdm|modulation|noise|filter|spectrum|signal|wireless|noma|beamforming",
    "Predictive Analytics":       r"predict|forecast|churn|regression|prognos",
}

TECHNIQUES = {
    "Deep Learning":      r"deep|neural|\bcnn\b|yolo|transformer|googlenet|resnet|vgg|swin|densenet|efficientnet|lstm|gan\b|attention|vit\b",
    "Classical ML":       r"machine learning|random forest|svm|xgboost|classifier|decision tree|knn|regression|ensemble",
    "Explainable AI":     r"explainab|interpretab|grad-?cam|shap|lime",
    "Transfer Learning":  r"transfer learning|pre-?trained|fine-?tun",
    "Simulation":         r"simulation|comsol|cst|hfss|scaps|matlab|simulink|ltspice|proteus",
    "Optimization":       r"optimi[sz]|genetic|swarm|metaheuristic|mppt",
    "Hardware Prototype": r"esp32|arduino|prototype|hardware|sensor module|microcontroller",
}


def _hits(table, text):
    return [name for name, pat in table.items() if re.search(pat, text)]


def tag_item(item: dict) -> dict:
    text = f"{item.get('title') or ''} {item.get('description') or ''}".lower()
    domains = PROJECT_DOMAINS if item["type"] == "project" else THESIS_DOMAINS
    d = _hits(domains, text)
    t = _hits(TECHNIQUES, text)
    return {"domain": d or ["Other"], "technique": t}
