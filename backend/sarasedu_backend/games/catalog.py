DEFAULT_GAMES = [
    {
        "slug": "dataset-quiz",
        "title": "Dataset Quiz",
        "description": "A subject quiz inspired by Hugging Face dataset-driven quizzes.",
        "category": "quiz",
        "difficulty": "easy",
        "icon": "Flame",
        "upstream_source": "https://huggingface.co/spaces/huggingface-course/supervised_finetuning_quiz",
        "upstream_label": "huggingface-course/supervised_finetuning_quiz",
        "estimated_minutes": 8,
        "config": {
            "question_bank": [
                {"id": 1, "prompt": "Which dataset split is commonly used for evaluation?", "options": ["train", "eval", "test", "cache"], "answer": "test"},
                {"id": 2, "prompt": "What does a model learn from labeled examples?", "options": ["supervised patterns", "only randomness", "file names", "browser history"], "answer": "supervised patterns"},
            ],
        },
    },
    {
        "slug": "code-quiz",
        "title": "Code Quiz",
        "description": "A code comprehension challenge inspired by Hugging Face code quiz flows.",
        "category": "coding",
        "difficulty": "medium",
        "icon": "Code2",
        "upstream_source": "https://huggingface.co/spaces/huggingface-course/sft_code_quiz",
        "upstream_label": "huggingface-course/sft_code_quiz",
        "estimated_minutes": 10,
        "config": {
            "question_bank": [
                {"id": 1, "prompt": "What will `len([1, 2, 3])` return in Python?", "options": ["2", "3", "4", "Error"], "answer": "3"},
                {"id": 2, "prompt": "Which React hook manages component state?", "options": ["useRoute", "useState", "useStore", "useCache"], "answer": "useState"},
            ],
        },
    },
    {
        "slug": "wrdler",
        "title": "Wrdler Sprint",
        "description": "A timed word-guessing sprint inspired by Wrdler.",
        "category": "language",
        "difficulty": "medium",
        "icon": "Puzzle",
        "upstream_source": "https://huggingface.co/spaces/Surn/wrdler",
        "upstream_label": "Surn/wrdler",
        "estimated_minutes": 6,
        "config": {
            "words": ["LEARN", "BRAIN", "CLASS", "LOGIC", "TUTOR"],
        },
    },
    {
        "slug": "battlewords",
        "title": "Battlewords Grid",
        "description": "A vocabulary discovery game inspired by Battlewords.",
        "category": "language",
        "difficulty": "hard",
        "icon": "Swords",
        "upstream_source": "https://huggingface.co/spaces/Surn/Battlewords",
        "upstream_label": "Surn/Battlewords",
        "estimated_minutes": 12,
        "config": {
            "gridWords": ["MODEL", "TOKEN", "COURSE", "PYTHON", "REACT", "STREAM"],
        },
    },
]

