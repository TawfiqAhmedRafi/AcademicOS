"""
Text preprocessing.  This file decides most of the match quality, so the
synonym and stop-word lists are meant to be edited as you learn from real searches.

Pipeline:  lowercase -> glue tech tokens (ESP-32 -> esp32) -> phrase synonyms
           -> tokenise -> word synonyms -> stop-words -> stem
"""
import re
import unicodedata
from functools import lru_cache

from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

_stemmer = PorterStemmer()

# --------------------------------------------------------------------------
# Multi-word phrases  ->  one canonical token  (applied BEFORE tokenising)
# --------------------------------------------------------------------------
PHRASES = [
    (r"internet of things", "iot"),
    (r"machine learning", "ml"),
    (r"deep learning", "dl"),
    (r"artificial intelligence", "ai"),
    (r"convolutional neural networks?", "cnn"),
    (r"neural networks?", "nn"),
    (r"natural language processing", "nlp"),
    (r"computer vision", "cv"),
    (r"image processing", "imgproc"),
    (r"real[\s-]?time", "realtime"),
    (r"web[\s-]?(?:based|app(?:lication)?|site|portal|platform)", "webapp"),
    (r"mobile[\s-]?(?:app|application)", "mobileapp"),
    (r"android[\s-]?(?:app|application)", "mobileapp"),
    (r"finger[\s-]?print", "fingerprint"),
    (r"face (?:recognition|detection)", "facerecog"),
    (r"facial recognition", "facerecog"),
    (r"line[\s-]?follow(?:er|ing)", "linefollower"),
    (r"solar (?:panel|cell|energy|power)s?", "solar"),
    (r"photovoltaic", "solar"),
    (r"blood (?:donation|donor|donors|bank)", "blooddonation"),
    (r"voice (?:call|communication)", "voicecomm"),
    (r"audio (?:communication|transmission)", "voicecomm"),
    (r"two[\s-]?way (?:audio|voice)", "voicecomm"),
    (r"full[\s-]?duplex", "voicecomm"),
    (r"smart home", "smarthome"),
    (r"home automation", "smarthome"),
    (r"gas (?:leak|leakage)", "gasleak"),
    (r"fire (?:detection|alarm)", "fire firedetect"),
    (r"fire[\s-]?fight(?:ing|er|ers)?", "fire firefight"),
    (r"patch antenna", "patchantenna"),
    (r"meta[\s-]?(?:material|surface)s?", "metamaterial"),
    (r"transfer learning", "transferlearn"),
    (r"explainable ai|explainable|interpretab\w+", "xai"),
    (r"large language models?|language models?", "llm"),
    (r"graph neural network", "gnn"),
    (r"vision transformer", "vit"),
    (r"x[\s-]?rays?", "xray"),
    (r"skin lesion|skin cancer|skin disease", "skindisease"),
    (r"lung cancer", "lungcancer"),
    (r"autism(?: spectrum disorder)?", "autism"),
    (r"power loss", "powerloss"),
    (r"attendance (?:system|management|tracking|monitoring)", "attendance"),
    (r"e[\s-]?commerce", "ecommerce"),
    (r"mern(?: stack)?", "mern"),
    (r"node\.?js", "nodejs"),
    (r"react\.?js", "react"),
    (r"next\.?js", "nextjs"),
]
_PHRASES = [(re.compile(p), r) for p, r in PHRASES]

# ESP-32 / ESP 32 / HC-SR04 / DHT-11 -> esp32 / hcsr04 / dht11
_GLUE_TECH = re.compile(r"\b(esp|hc|dht|lm|mq|mpu|nrf|sx|max|ads|bme|bmp|r|rc|pca|tp|l)[\s-]?(\d+[a-z0-9]*)\b")
_GLUE_HYPHEN = re.compile(r"\b([a-z]{1,6})-(\d+[a-z0-9]*)\b")
_HCSR = re.compile(r"\bhc[\s-]?sr[\s-]?(\d+)\b")

# --------------------------------------------------------------------------
# Single-word synonyms  ->  canonical token  (applied AFTER tokenising)
# --------------------------------------------------------------------------
WORD_SYNONYMS = {
    # IoT / hardware
    "nodemcu": "esp32", "esp8266": "esp32", "esp32cam": "esp32",
    "microcontroller": "mcu", "arduino": "mcu", "atmega": "mcu", "stm32": "mcu",
    "rfid": "rfid", "nfc": "rfid",
    "ultrasonic": "ultrasonic", "hcsr04": "ultrasonic",
    "gsm": "gsm", "sim800": "gsm", "sim800l": "gsm", "sms": "gsm",
    "lorawan": "lora", "sx1278": "lora", "sx1276": "lora",
    "wifi": "wifi", "wi": "wifi", "bluetooth": "bluetooth", "hc05": "bluetooth",
    "gps": "gps", "neo6m": "gps",
    # web / software
    "website": "webapp", "webapp": "webapp", "portal": "webapp", "web": "webapp",
    "app": "mobileapp", "android": "mobileapp", "flutter": "mobileapp",
    "db": "database", "mongodb": "database", "mysql": "database", "firebase": "database",
    # ML
    "ml": "ml", "ai": "ai", "dl": "dl",
    "classifier": "classify", "classification": "classify", "classifying": "classify",
    "recognise": "recognize", "recognition": "recognize", "recognizing": "recognize",
    "recognising": "recognize",
    "prediction": "predict", "predicting": "predict", "forecasting": "predict",
    "forecast": "predict",
    "cnn": "cnn", "resnet": "cnn", "vgg": "cnn", "vgg16": "cnn", "googlenet": "cnn",
    "densenet": "cnn", "efficientnet": "cnn", "mobilenet": "cnn", "inception": "cnn",
    "yolov8": "yolo", "yolov11": "yolo", "yolov5": "yolo", "yolov7": "yolo",
    "swin": "vit", "bert": "transformer", "transformers": "transformer",
    # spelling variants
    "colour": "color", "analyse": "analysis", "analyze": "analysis", "analyses": "analysis",
    "monitoring": "monitor", "monitors": "monitor", "tracking": "track", "tracker": "track",
    "tracks": "track", "detection": "detect", "detects": "detect", "detecting": "detect",
    "detector": "detect", "controlling": "control", "controller": "control",
    "controlled": "control", "controls": "control",
    "measuring": "measure", "measurement": "measure", "measures": "measure",
    # people
    "pupil": "student", "pupils": "student", "learner": "student", "learners": "student",
    "teacher": "teacher", "instructor": "teacher", "faculty": "teacher", "lecturer": "teacher",
    "alumni": "alumni", "alumnus": "alumni", "graduates": "alumni",
    # energy
    "inverter": "inverter", "converter": "converter",
    "mppt": "mppt",
    # agriculture / fire
    "farm": "agri", "farming": "agri", "farmer": "agri", "farmers": "agri",
    "agriculture": "agri", "agricultural": "agri", "agritech": "agri", "crop": "agri",
    "crops": "agri", "irrigation": "irrigat",
    "extinguish": "firefight", "extinguisher": "firefight", "extinguishing": "firefight",
    "extinguishes": "firefight", "suppression": "firefight",
    # misc
    "wireless": "wireless", "cordless": "wireless",
    "automatic": "automate", "automatically": "automate", "automated": "automate",
    "automation": "automate", "automating": "automate",
}

# --------------------------------------------------------------------------
# Stop words.  Generic English + words that appear in EVERY project/thesis and
# therefore carry no meaning (they would make unrelated items look similar).
# --------------------------------------------------------------------------
DOMAIN_STOPWORDS = {
    # project boilerplate
    "system", "systems", "project", "projects", "based", "using", "use", "uses", "used",
    "designed", "design", "built", "build", "provides", "provide", "provided", "helps",
    "help", "allows", "allow", "lets", "let", "makes", "make", "made", "supports",
    "support", "aims", "aim", "enables", "enable", "ensures", "ensure", "includes",
    "including", "include", "developed", "develop", "development", "implement",
    "implemented", "implementation", "proposed", "propose", "present", "presents",
    "efficient", "efficiently", "effective", "easy", "simple", "low", "cost", "high",
    "single", "multiple", "various", "different", "also", "via", "etc", "like", "such",
    "user", "users", "people", "ruet", "university", "department", "module", "modules",
    "device", "application", "applications", "solution", "tool", "platform", "features",
    "feature", "function", "functions", "functionality", "work", "works", "working",
    "reduces", "reduce", "improves", "improve", "improved", "improving", "enhance",
    "enhanced", "enhancing", "manual", "need", "needs", "one", "two", "three", "can",
    "may", "will", "able", "way", "ways", "allowing", "enabling", "providing",
    "integrates", "integrated", "integrating", "integration", "combines", "combining",
    "combined", "intelligent", "smart", "automated", "aims",
    # thesis boilerplate
    "novel", "approach", "approaches", "framework", "analysis", "performance",
    "comparative", "study", "investigation", "evaluation", "model", "models", "method",
    "methods", "technique", "techniques", "towards", "toward", "advanced", "advancing",
    "optimized", "optimised", "optimization", "effective", "high", "improved",
    "accurate", "robust", "application", "applications", "case", "review", "survey",
    "hybrid", "deep",
}
# NOTE: "smart", "deep", "hybrid" are stopped on purpose: "smart X" is in half the
# project titles.  "dl" / "ml" / "cnn" still carry the learning topic.

# scikit-learn's English list contains meaningful engineering words ("fire", "call",
# "move", "find", "top", "front", "part", "full" ...).  Keep those searchable.
KEEP_WORDS = {"fire", "call", "move", "find", "top", "front", "back", "bottom", "part",
              "full", "side", "show", "fill", "empty", "thick", "thin", "mill", "bill",
              "detail", "interest", "found", "amount", "system"}  # 'system' re-added to DOMAIN below
STOPWORDS = (frozenset(ENGLISH_STOP_WORDS) - KEEP_WORDS) | DOMAIN_STOPWORDS

_TOKEN = re.compile(r"[a-z][a-z0-9]*|\d+[a-z][a-z0-9]*")  # drops bare numbers


def _normalise_unicode(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    return (text.replace("\u2013", "-").replace("\u2014", "-")
                .replace("\u2018", "'").replace("\u2019", "'"))


@lru_cache(maxsize=100_000)
def _stem(word: str) -> str:
    # Do not stem canonical/tech tokens that contain digits
    if any(ch.isdigit() for ch in word):
        return word
    return _stemmer.stem(word)


def tokenize(text: str, keep_stopwords: bool = False) -> list[str]:
    """Return a list of normalised STEMMED tokens."""
    if not text:
        return []
    t = _normalise_unicode(str(text)).lower()
    t = _HCSR.sub(r"hcsr\1", t)
    t = _GLUE_TECH.sub(lambda m: m.group(1) + m.group(2), t)
    t = _GLUE_HYPHEN.sub(lambda m: m.group(1) + m.group(2), t)
    for pat, repl in _PHRASES:
        t = pat.sub(repl, t)
    out = []
    for tok in _TOKEN.findall(t):
        tok = WORD_SYNONYMS.get(tok, tok)
        if not keep_stopwords and (tok in STOPWORDS or len(tok) < 2):
            continue
        out.append(_stem(tok))
    return out


def preprocess(text: str) -> str:
    """Tokens joined by spaces, ready for TfidfVectorizer."""
    return " ".join(tokenize(text))


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT_SPLIT.split(text or "") if len(s.strip()) > 3]


if __name__ == "__main__":
    for s in ["ESP-32 based Full-Duplex Audio Communication System",
              "An Internet of Things (IoT) fingerprint attendance system with R307S",
              "Autism Spectrum Disorder screening using GoogLeNet"]:
        print(s, "->", tokenize(s))


# Friendly names for canonical tokens, so "shared terms" read naturally in the UI.
LABELS = {
    "iot": "IoT", "ml": "machine learning", "dl": "deep learning", "ai": "AI",
    "cnn": "CNN", "nn": "neural network", "nlp": "NLP", "cv": "computer vision",
    "imgproc": "image processing", "realtim": "real-time", "realtime": "real-time",
    "webapp": "web app", "mobileapp": "mobile app", "fingerprint": "fingerprint",
    "facerecog": "face recognition", "linefollow": "line follower",
    "linefollower": "line follower", "solar": "solar", "blooddon": "blood donation",
    "blooddonation": "blood donation", "voicecomm": "voice/audio communication",
    "smarthom": "smart home", "smarthome": "smart home", "gasleak": "gas leak",
    "firedetect": "fire detection", "patchantenna": "patch antenna",
    "metamateri": "metamaterial", "metamaterial": "metamaterial",
    "transferlearn": "transfer learning", "xai": "explainable AI", "llm": "language model",
    "gnn": "graph NN", "vit": "vision transformer", "xray": "X-ray",
    "skindiseas": "skin disease", "skindisease": "skin disease", "lungcanc": "lung cancer",
    "lungcancer": "lung cancer", "powerloss": "power loss", "attend": "attendance",
    "ecommerc": "e-commerce", "ecommerce": "e-commerce", "mcu": "microcontroller",
    "esp32": "ESP32", "lora": "LoRa", "gsm": "GSM", "gps": "GPS", "rfid": "RFID",
    "mppt": "MPPT", "yolo": "YOLO", "mern": "MERN", "nodej": "Node.js", "nodejs": "Node.js",
    "autism": "autism", "classifi": "classification", "classify": "classification",
}
