# Our Story: A Love Quest — Asset Usage Guide for Ren'Py

---

## Quick Start

1. Create the directory structure below
2. Place your AI-generated images in the corresponding folders
3. Update `script.rpy` with the asset references shown in each section

---

## Directory Structure

```
anniversary-renpy/
└── game/
    ├── script.rpy
    ├── definitions.rpy
    ├── gui/
    │   └── (Ren'Py default GUI files)
    ├── backgrounds/              ← All chapter backgrounds
    │   ├── bg_main_menu.png
    │   ├── bg_ch1_room_night.png
    │   ├── bg_ch1_laptop_closeup.png
    │   ├── bg_ch2_social_profile.png
    │   ├── bg_ch3_chat_room.png
    │   ├── bg_ch4_office_full.png
    │   ├── bg_ch4_aashna_closeup.png
    │   ├── bg_ch5_office_day.png
    │   ├── bg_ch5_office_corridor.png
    │   ├── bg_ch6_office_gift.png
    │   ├── bg_ch7_restaurant.png
    │   ├── bg_ch7_restaurant_window.png
    │   ├── bg_ch8_clearing.png
    │   ├── bg_ch8_clearing_stars.png
    │   ├── bg_ch9_garden_dawn.png
    │   ├── bg_ch9_study_morning.png
    │   ├── bg_ch10_storm_outside.png
    │   ├── bg_ch10_storm_inside.png
    │   ├── bg_ch11_apartment.png
    │   ├── bg_ch11_gifts.png
    │   ├── bg_ch12_family.png
    │   ├── bg_ch12_letters.png
    │   ├── bg_ch13_paths.png
    │   ├── bg_ch13_dawn_ethereal.png
    │   ├── bg_ch14_wedding.png
    │   ├── bg_ch14_engagement.png
    │   ├── bg_ch14_wedding_party.png
    │   ├── bg_ch15_light.png
    │   └── bg_ch15_floating.png
    ├── sprites/                  ← Character sprite sheets
    │   ├── pravi/
    │   │   ├── happy.png
    │   │   ├── neutral.png
    │   │   ├── surprised.png
    │   │   ├── thinking.png
    │   │   └── loving.png
    │   └── aashna/
    │       ├── happy.png
    │       ├── shy.png
    │       ├── neutral.png
    │       ├── laughing.png
    │       ├── surprised.png
    │       ├── emotional.png
    │       └── loving.png
    ├── images/
    │   ├── props/
    │   │   ├── prop_book.png
    │   │   ├── prop_mug.png
    │   │   ├── prop_earphones.png
    │   │   ├── prop_framed_photos.png
    │   │   ├── prop_letters.png
    │   │   └── prop_rings.png
    │   ├── effects/
    │   │   ├── overlay_rain.png
    │   │   └── overlay_sparkles.png
    │   └── ui/
    │       ├── dialogue_box.png
    │       ├── chapter_title_bg.png
    │       └── main_menu_bg.png
    ├── music/
    │   ├── main_menu.ogg
    │   ├── ch1_ambient.ogg
    │   ├── ch2_ambient.ogg
    │   ├── ch3_ambient.ogg
    │   ├── ch4_ambient.ogg
    │   ├── ch5_ambient.ogg
    │   ├── ch6_ambient.ogg
    │   ├── ch7_ambient.ogg
    │   ├── ch8_ambient.ogg
    │   ├── ch9_ambient.ogg
    │   ├── ch10_ambient.ogg
    │   ├── ch11_ambient.ogg
    │   ├── ch12_ambient.ogg
    │   ├── ch13_ambient.ogg
    │   ├── ch14_ambient.ogg
    │   └── ch15_ambient.ogg
    └── sfx/
        ├── click.wav
        ├── hover.wav
        ├── transition.wav
        ├── discovery.wav
        └── heartbeat.wav
```

---

## Character Sprite Setup

### Ren'Py Definitions

Add to `definitions.rpy`:

```rpy
# Character definitions with sprite paths
define pravi = Character("Prawal",
    color="#FFBB99",
    what_color="#FFFFFF",
    who_prefix="",
    who_suffix="")

define aashna = Character("Aashna",
    color="#FFAACC",
    what_color="#FFFFFF",
    who_prefix="",
    who_suffix="")

define narrator = Character(None,
    what_color="#FFCCDD",
    what_italic=True)

# Sprite definitions
image pravi happy = "sprites/pravi/happy.png"
image pravi neutral = "sprites/pravi/neutral.png"
image pravi surprised = "sprites/pravi/surprised.png"
image pravi thinking = "sprites/pravi/thinking.png"
image pravi loving = "sprites/pravi/loving.png"

image aashna happy = "sprites/aashna/happy.png"
image aashna shy = "sprites/aashna/shy.png"
image aashna neutral = "sprites/aashna/neutral.png"
image aashna laughing = "sprites/aashna/laughing.png"
image aashna surprised = "sprites/aashna/surprised.png"
image aashna emotional = "sprites/aashna/emotional.png"
image aashna loving = "sprites/aashna/loving.png"
```

### Sprite Positioning

```rpy
# Position constants (left/center/right with slight offset)
define left_pos = Position(xpos=0.2, ypos=1.0, anchor=(0.5, 1.0))
define center_pos = Position(xpos=0.5, ypos=1.0, anchor=(0.5, 1.0))
define right_pos = Position(xpos=0.8, ypos=1.0, anchor=(0.5, 1.0))
```

---

## Scene-by-Scene Asset Usage

### Main Menu

```rpy
screen main_menu():
    tag menu
    modal True

    # Background
    add "backgrounds/bg_main_menu.png"

    # Optional: floating particles effect
    add "images/effects/overlay_sparkles.png"

    # Title card
    frame:
        xalign 0.5
        yalign 0.35
        background "#00000066"
        padding (40, 20)
        text "Our Story" size 72 color "#FFF2F6"

    # Buttons
    textbutton "Begin Our Story" action Start() xalign 0.5 yalign 0.55
    textbutton "Continue" action Jump("continue_game") xalign 0.5 yalign 0.65
    textbutton "Settings" action ShowMenu("preferences") xalign 0.5 yalign 0.75
```

---

### Chapter 1: "A Face in the Feed"

```rpy
label chapter_1:
    # Show chapter intro
    call screen chapter_intro("Chapter 1", "A Face in the Feed")

    # Scene 1: Full room view
    scene bg_ch1_room_night with fade
    show pravi neutral at left_pos

    narrator "It was 2020. The world had paused."
    narrator "Everyone was home. Screens were our only windows to the world outside."
    narrator "And somewhere in that digital silence… Prawal found her."

    # Player interaction: walk to laptop
    # (In visual novel style, this is a transition)

    # Scene 2: Close-up on laptop
    scene bg_ch1_laptop_closeup with dissolve
    pause 0.5

    pravi "Our company had organised an online event during the lockdown."
    pravi "Aashna was in one of the photos from the post."
    pravi "Something stopped me. I kept coming back to that photo."
    pravi "There was something about her smile… I couldn't explain it."
    pravi "I didn't even know Aashna's name yet."
    pravi "But I already wanted to."

    jump chapter_2
```

---

### Chapter 2: "One Click. One Leap."

```rpy
label chapter_2:
    call screen chapter_intro("Chapter 2", "One Click. One Leap.")

    scene bg_ch2_social_profile with fade
    show pravi neutral at left_pos

    pravi "I searched. LinkedIn first. Then Facebook."
    pravi "And there she was. Same face. Same smile."

    pravi "I stared at that Add Friend button for longer than I'd like to admit."
    pravi "What if Aashna doesn't accept? What if she thinks it's weird?"
    pravi "One breath. One click."

    # Transition to next
    scene black with dissolve
    aashna "{size=+10}✓ Friend request accepted.{/size}"

    pravi "That one small notification changed the course of everything."

    jump chapter_3
```

---

### Chapter 3: "Hello… and Goodbye"

```rpy
label chapter_3:
    call screen chapter_intro("Chapter 3", "Hello… and Goodbye")

    scene bg_ch3_chat_room with fade
    show pravi thinking at left_pos

    narrator "Connected. Friends on a screen."
    narrator "The messages began — hesitant, then warm."

    # Chat sequence (using narrator for simplicity)
    narrator "We started talking. Small things at first."

    # Simulate chat bubbles
    pravi "How's work? How's the lockdown treating you?"
    aashna "It's... quiet. But nice to talk to someone."
    pravi "Same here."

    narrator "Slowly… we found a rhythm."

    narrator "And then life happened. The conversations faded."
    narrator "Weeks went by. Then months."
    narrator "Silence."

    pravi "But I thought about Aashna more than I should have."
    pravi "Some stories aren't done yet. They just… pause."

    jump chapter_4
```

---

### Chapter 4: "The Girl in the Hoodie"

```rpy
label chapter_4:
    call screen chapter_intro("Chapter 4", "The Girl in the Hoodie")

    # Scene 1: Office first sight
    scene bg_ch4_office_full with fade
    show pravi neutral at left_pos
    show aashna neutral at right_pos behind pravi

    narrator "Months had passed. Lockdown restrictions were slowly easing."
    narrator "The office reopened — partially. Rosters. Limited strength."
    narrator "Prawal walked in that morning not expecting anything special."

    narrator "And then I saw her."
    narrator "Not a photo. Not a screen."
    narrator "Aashna."
    narrator "Standing there in that maroon hoodie."
    narrator "I think my heart forgot how to beat for a second."
    narrator "She was even more beautiful in person."

    # Transition to close-up
    scene bg_ch4_aashna_closeup with dissolve

    narrator "I didn't say much that day. I didn't need to."
    narrator "Some moments just need to be felt."

    jump chapter_5
```

---

### Chapter 5: "Starting Over"

```rpy
label chapter_5:
    call screen chapter_intro("Chapter 5", "Starting Over")

    scene bg_ch5_office_day with fade
    show pravi happy at left_pos
    show aashna neutral at right_pos

    pravi "After that office day, something shifted."
    pravi "We started talking again. Properly this time."
    pravi "Little chats. A question here. A favour there."

    aashna "Hey, can you help me with something at work?"

    pravi "I jumped at every chance — not just to help…"
    pravi "But just to have a reason to talk to Aashna."
    pravi "Every small moment with her felt like something worth holding onto."

    # Walk/transition scene
    scene bg_ch5_office_corridor with dissolve

    pravi "The first time I really helped her…"
    pravi "It felt like the world gave us a reason to meet again."

    jump chapter_6
```

---

### Chapter 6: "Wireless & Heartstrings"

```rpy
label chapter_6:
    call screen chapter_intro("Chapter 6", "Wireless & Heartstrings")

    scene bg_ch6_office_gift with fade
    show pravi happy at left_pos
    show aashna surprised at right_pos

    pravi "I wanted to do something nice. Something unexpected."
    pravi "So I got Aashna wireless earphones. A surprise."

    show aashna happy at right_pos

    aashna "Oh my god — I love them! Thank you so much!"

    pravi "And then… she forgot them at the office."

    aashna "I remembered when I got home. I called, I tried — they were just gone."

    pravi "I saw how sad she was. And made up my mind instantly."
    pravi "Aashna was going to have that smile back."
    pravi "The exact same pair. Again."
    pravi "Because some smiles are worth every penny. Twice over."

    jump chapter_7
```

---

### Chapter 7: "Pizza & New Beginnings"

```rpy
label chapter_7:
    call screen chapter_intro("Chapter 7", "Pizza & New Beginnings")

    scene bg_ch7_restaurant with fade
    show pravi happy at left_pos
    show aashna happy at right_pos

    pravi "The day I gave Aashna the second pair of earphones…"
    pravi "We decided to go out after office. Just like that."
    pravi "Aashna, me, and a friend."
    pravi "A small pizza place. Nothing fancy."
    pravi "But it was our first time outside together."
    pravi "Our first real evening."

    aashna "This is really nice… we should do this more often."

    pravi "Something about that evening just… felt right."
    pravi "Like we'd always been doing this."

    # Window view transition
    scene bg_ch7_restaurant_window with dissolve

    narrator "Outside, the world was just beginning to glow."
    narrator "Inside, two hearts were finding each other."

    jump chapter_8
```

---

### Chapter 8: "Something Real"

```rpy
label chapter_8:
    call screen chapter_intro("Chapter 8", "Something Real")

    scene bg_ch8_clearing with fade
    show pravi neutral at left_pos
    show aashna neutral at right_pos

    pravi "After that evening… things were different."
    pravi "In the best possible way."
    pravi "Messages came easier. Silences felt comfortable."
    pravi "We stopped pretending it was just friendship."
    pravi "Something was quietly, beautifully growing between Prawal and Aashna."

    # Stars transition
    scene bg_ch8_clearing_stars with dissolve
    show pravi loving at center_pos
    show aashna loving at center_pos

    pravi "And for the first time… I wasn't afraid of it."

    jump chapter_9
```

---

### Chapter 9: "Letters, Every Morning"

```rpy
label chapter_9:
    call screen chapter_intro("Chapter 9", "Letters, Every Morning")

    scene bg_ch9_garden_dawn with fade

    narrator "2021. The world was still finding its feet."
    narrator "And every single morning — before the day began — Prawal sent a message to Aashna."
    narrator "The same ritual. Every day. Without fail."
    narrator "365 mornings. Then more."

    # Morning scene
    scene bg_ch9_study_morning with dissolve
    show pravi loving at left_pos

    pravi "Good morning, Aashna."
    pravi "I woke up thinking of you — like I do every morning now."
    pravi "I had to tell you that."
    pravi "I don't know what this feeling is yet."
    pravi "But it felt too important to keep to myself."

    pravi "Good morning again, Aashna."
    pravi "I saw something funny today and thought — she'd laugh at this."
    pravi "So I sent it to you immediately."
    pravi "Sharing little things with you feels like the most natural thing."

    pravi "Good morning."
    pravi "Some mornings I message you just to say I'm thinking of you."
    pravi "Today: I'm hopeful."
    pravi "About us. About everything."
    pravi "That feeling — warm and steady — it belongs to you."

    pravi "Good morning, Aashna."
    pravi "Day 200 something. I've lost count."
    pravi "But I haven't missed a single morning."
    pravi "I think you know why by now."
    pravi "It's you. It always was."

    pravi "Good morning."
    pravi "Every morning — before the world woke up — this message went to you first."
    pravi "Each one sent. Each one meant."
    pravi "By the time this one reached you, Aashna…"
    pravi "You already had my heart. Completely."

    jump chapter_10
```

---

### Chapter 10: "Little Storms"

```rpy
label chapter_10:
    call screen chapter_intro("Chapter 10", "Little Storms")

    scene bg_ch10_storm_outside with fade

    narrator "Not every day was golden."
    narrator "There were silences. Misunderstandings. Words said too fast."
    narrator "But even in the storm…"

    # Rain overlay
    add "images/effects/overlay_rain.png"

    scene bg_ch10_storm_inside with fade
    show pravi neutral at left_pos
    show aashna neutral at right_pos

    narrator "Not everything was smooth. Love never is."

    pravi "We had our arguments. Our silences. Our misunderstandings."

    aashna "Sometimes I didn't know how to say what I was feeling."

    pravi "Words said in the heat of a moment."
    pravi "Times when everything felt heavy."

    pravi "But every single time… Prawal and Aashna came back."
    pravi "A little more patient. A little more understanding."

    pravi "Every storm made us stronger. That's how we knew it was real."

    jump chapter_11
```

---

### Chapter 11: "Love in a Box"

```rpy
label chapter_11:
    call screen chapter_intro("Chapter 11", "Love in a Box")

    scene bg_ch11_apartment with fade
    show pravi happy at left_pos

    pravi "Sometimes, after a fight — or even without reason —"
    pravi "I'd order Aashna's favourite food. Delivered to her door."
    pravi "No explanation needed."
    pravi "Just: here. Eat. I'm thinking of you."
    pravi "Food says 'I love you' in every language."

    # Gift discovery scene
    scene bg_ch11_gifts with dissolve

    narrator "One time, after a disagreement…"
    pravi "I didn't know what to say."
    pravi "So I messaged the delivery partner before the drop."
    pravi "'Can you please tell her I'm sorry from my side?'"

    narrator "He did. He actually said it."

    aashna "…the delivery guy said you're sorry. 😂"

    pravi "That delivery guy will never know what he helped fix that evening."

    # Custom gift scene
    pravi "I had a book made. Our story — illustrated, printed, bound."
    pravi "Photos, notes, little captions."
    pravi "Every chapter of Prawal & Aashna, held in your hands."

    show "images/props/prop_book.png" at center with dissolve

    aashna "…"

    pravi "That silence was the best review I ever got."

    jump chapter_12
```

---

### Chapter 12: "Two Families, One Story"

```rpy
label chapter_12:
    call screen chapter_intro("Chapter 12", "Two Families, One Story")

    scene bg_ch12_family with fade
    show pravi happy at left_pos
    show aashna happy at right_pos

    narrator "The time came to take the next step."
    narrator "To bring our two worlds together."

    pravi "I remember how nervous I was that day."

    narrator "But the moment our families met…"
    narrator "It just felt natural."
    narrator "Like they'd always known each other."
    narrator "Like this was always meant to be."

    # Letters display
    scene bg_ch12_letters with dissolve

    narrator "A letter from Mom."
    narrator "'I always knew you'd find someone who sees you the way I do.'"
    narrator "'Take care of each other. That's all I ask.'"

    narrator "A few words from Dad."
    narrator "'I'm proud of the person you've become.'"
    narrator "'And I'm proud of who you chose to walk beside.'"

    narrator "Four voices. One story."
    narrator "Every letter said the same thing in a different way."
    narrator "'You are loved. You are seen. You belong here.'"

    aashna "My family already loved you."
    pravi "And mine already loved you too."

    narrator "Two families. One story. And it was just beginning."

    jump chapter_13
```

---

### Chapter 13: "Paths That Merge"

```rpy
label chapter_13:
    call screen chapter_intro("Chapter 13", "Paths That Merge")

    scene bg_ch13_paths with fade
    show pravi neutral at left_pos
    show aashna neutral at right_pos

    narrator "Two lives. Two journeys. Two different stories."
    narrator "But somewhere along the way… the paths began to bend."

    # Ethereal transition
    scene bg_ch13_dawn_ethereal with dissolve
    show pravi loving at center_pos
    show aashna loving at center_pos

    narrator "Two paths. One destination."

    pravi "Every step I took… led me closer to her."
    pravi "Through distance, through doubt, through time."
    pravi "And now… here. Together."

    aashna "It was always going to be you."

    narrator "Some paths are meant to merge."

    jump chapter_14
```

---

### Chapter 14: "From Engagement to Forever"

```rpy
label chapter_14:
    call screen chapter_intro("Chapter 14", "From Engagement to Forever")

    # Engagement moment
    show "images/props/prop_rings.png" at center with dissolve

    narrator "First came the engagement."
    narrator "A circle of gold. A promise made."

    # Wedding scene
    scene bg_ch14_wedding with fade
    show pravi loving at left_pos
    show aashna loving at right_pos

    narrator "And then… the wedding."
    narrator "The flowers. The laughter. The tears of joy."

    pravi "I looked at Aashna in that moment…"
    pravi "And I thought — this is the best day of my life."
    pravi "This is the beginning of everything."

    # Celebration
    scene bg_ch14_wedding_party with dissolve

    narrator "Surrounded by everyone they loved."
    narrator "Two families. Two lives. One forever."

    jump chapter_15
```

---

### Chapter 15: "4 Years & Counting"

```rpy
label chapter_15:
    call screen chapter_intro("Chapter 15", "4 Years & Counting")

    # Final ethereal scene
    scene bg_ch15_light with fade
    show pravi loving at center_pos
    show aashna loving at center_pos

    # Add sparkle effect
    add "images/effects/overlay_sparkles.png" with dissolve

    pravi "Four years."
    pravi "Four years of mornings and midnights."
    pravi "Of fights and forgiveness."
    pravi "Of laughter that echoes and silences that comfort."
    pravi "Four years of growing."
    pravi "Four years of choosing each other."

    pravi "And I fall in love with you a little more… every single day."

    pravi "Happy 4th anniversary, Aashna. ❤"

    pravi "Here's to forever."

    # Final frame
    scene bg_ch15_floating with dissolve
    show pravi loving at center
    show aashna loving at center

    narrator "Four years… and I still fall in love with you every single day."

    # Return to main menu option
    call screen final_message("Play Again")

    return
```

---

## Screen Definitions

### Chapter Intro Screen

```rpy
screen chapter_intro(title, subtitle):
    modal True

    frame:
        xalign 0.5
        yalign 0.4
        background "#00000088"
        padding (60, 30)

        vbox:
            xalign 0.5
            text title:
                size 64
                color "#FFFFFF"
                text_align 0.5
            text subtitle:
                size 32
                color "#FFAABB"
                text_align 0.5

    timer 3.0 action Hide("chapter_intro", dissolve)
```

### Final Message Screen

```rpy
screen final_message(message):
    modal True

    frame:
        xalign 0.5
        yalign 0.6
        background "#00000066"
        padding (40, 20)

        text message:
            size 48
            color "#FFFFFF"

    textbutton "Main Menu" action MainMenu() xalign 0.5 yalign 0.75
```

---

## Audio Integration

```rpy
# Per-chapter music example
label chapter_1:
    play music "music/ch1_ambient.ogg" fadeout 1.0 fadein 1.0

    scene bg_ch1_room_night with fade

    # ... dialogue ...

    stop music fadeout 1.5
    jump chapter_2

# Transition music
label chapter_transition:
    play sound "sfx/transition.wav"
    pause 0.5
    return
```

---

## Save/Load System

```rpy
# Track current chapter
default persistent.current_chapter = 0

label continue_game:
    $ ch = persistent.current_chapter
    jump expression "chapter_" + str(ch)

# Update after each chapter
label chapter_1_end:
    $ persistent.current_chapter = 1
    jump chapter_2
```

---

## Mobile Optimization

```rpy
# In options.rpy
define config.screen_width = 1080
define config.screen_height = 1920

# For tablets
define config.mobile_portrait_scales = True
define config.mobile_landscape_scales = True

# Save on background
define config.save_on_mobile_background = True
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Image not loading | Check filename matches exactly (case-sensitive) |
| Sprite too large | Resize to max 800px width for sprites |
| Black screen | Ensure `scene` statement is before `with` transition |
| Music not playing | Convert audio to `.ogg` format for Ren'Py |
| Memory issues | Use `im.cache.pyimport()` for large backgrounds |

---

## Next Steps

1. Place all AI-generated images in the correct folders
2. Update `definitions.rpy` with sprite definitions
3. Copy scene scripts from this guide into `script.rpy`
4. Add music files to `music/` folder
5. Test each chapter in Ren'Py
6. Build for web/mobile

---

*Generated for "Our Story: A Love Quest" Ren'Py migration*