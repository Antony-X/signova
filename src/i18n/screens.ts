/**
 * Strings for the Lessons, History and Settings screens, in English and Georgian.
 * The sign descriptions are short teaching notes for the demo; a GESL signer should check them.
 */
import { useApp } from '@/theme/app-context';

export type LessonKey = 'alphabet' | 'basics' | 'school';
export type Lesson = { id: string; name: string; how: string };
export type Message = { id: string; who: 'student' | 'teacher'; time: string; ka: string; en: string };

const en = {
  lessons: {
    title: 'Sign lessons',
    sub: 'Pick a topic and learn its signs one by one.',
    back: 'All lessons',
    practice: 'Practice with the camera',
    meta: (n: number, min: number) => `${n} signs · ${min} min`,
    cats: {
      alphabet: { title: 'Alphabet', line: 'The first letters of the Georgian alphabet.', min: 4 },
      basics: { title: 'Basic phrases', line: 'Greetings and polite words.', min: 5 },
      school: { title: 'Classroom', line: 'Signs for asking questions in a lesson.', min: 10 },
    },
    items: {
      alphabet: [
        { id: 'a1', name: 'Letter ა', how: 'Make a fist and rest your thumb against the side of your index finger.' },
        { id: 'a2', name: 'Letter ბ', how: 'Hold four fingers straight up together and fold your thumb across your palm.' },
        { id: 'a3', name: 'Letter გ', how: 'Point your index finger and thumb down and keep the other fingers curled.' },
        { id: 'a4', name: 'Letter დ', how: 'Hold your index and middle fingers up together and rest your thumb against them.' },
      ],
      basics: [
        { id: 'b1', name: 'Hello', how: 'Raise an open hand near your forehead and move it forward, away from you.' },
        { id: 'b2', name: 'Thank you', how: 'Touch your chin with the fingertips of a flat hand, then move the hand forward.' },
        { id: 'b3', name: 'Please', how: 'Put a flat hand on your chest and move it in a small circle.' },
        { id: 'b4', name: 'Yes', how: 'Make a fist and move it up and down, like a head nodding.' },
      ],
      school: [
        { id: 's1', name: 'Teacher', how: 'Hold both flat hands near your temples, move them forward, then lower them.' },
        { id: 's2', name: 'Question', how: 'Draw a question mark in the air with your index finger.' },
        { id: 's3', name: 'Understand', how: 'Hold a fist near your forehead and flick your index finger straight up.' },
        { id: 's4', name: 'Explain', how: 'Pinch thumb and index finger on both hands and move the hands forward and back in turns.' },
        { id: 's5', name: 'Problem', how: 'Bend two fingers on each hand, touch the knuckles together and twist them in opposite ways.' },
        { id: 's6', name: 'Step', how: 'Hold both flat hands palms down and move them forward one after the other, like feet.' },
        { id: 's7', name: 'Homework', how: 'Sign home (touch your cheek), then work (tap one fist on the other wrist).' },
        { id: 's8', name: 'Repeat', how: 'Bend one hand and bring its fingertips down onto your other open palm.' },
      ],
    } as Record<LessonKey, Lesson[]>,
  },
  history: {
    title: 'Conversation history',
    sub: 'What was signed and spoken in your lessons.',
    student: 'Student · signed',
    teacher: 'Teacher · spoke',
    days: [
      {
        id: 'today',
        label: 'Today',
        items: [
          { id: 'm1', who: 'student', time: '10:42', ka: 'შეგიძლიათ რომ ეს ამოცანა ამიხსნათ?', en: 'Can you explain this problem to me?' },
          { id: 'm2', who: 'teacher', time: '10:42', ka: 'რომელი ნაბიჯი ვერ გაიგე?', en: 'Which step didn’t you understand?' },
        ],
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        items: [
          { id: 'm3', who: 'student', time: '09:15', ka: 'შეგიძლიათ დაფაზე დაწეროთ?', en: 'Could you write it on the board?' },
          { id: 'm4', who: 'teacher', time: '09:15', ka: 'კარგი, ახლავე დავწერ.', en: 'Okay, I’ll write it now.' },
          { id: 'm5', who: 'student', time: '13:40', ka: 'საშინაო დავალება როდის უნდა ჩავაბარო?', en: 'When do I hand in the homework?' },
          { id: 'm6', who: 'teacher', time: '13:41', ka: 'ხვალ, გაკვეთილის დაწყებამდე.', en: 'Tomorrow, before the lesson starts.' },
        ],
      },
      {
        id: 'fri',
        label: 'Friday, 20 November',
        items: [
          { id: 'm7', who: 'student', time: '11:05', ka: 'ახლა გავიგე, მადლობა.', en: 'I understand now, thank you.' },
          { id: 'm8', who: 'teacher', time: '11:05', ka: 'ყოჩაღ! შემდეგ ამოცანაზე გადავიდეთ.', en: 'Well done. Let’s move on to the next problem.' },
        ],
      },
    ] as { id: string; label: string; items: Message[] }[],
  },
  settings: {
    title: 'Settings',
    groupLanguage: 'Language',
    groupDisplay: 'Display',
    groupAvatar: 'Avatar',
    appLang: 'App language',
    appLangSub: 'Menus, buttons and messages',
    signLang: 'Sign language',
    signLangSub: 'Georgian (GESL) or American (ASL)',
    dark: 'Dark mode',
    darkSub: 'Light text on a dark background',
    captions: 'Captions under the avatar',
    captionsSub: 'Show the words while the avatar signs',
    speed: 'Signing speed',
    speedSub: 'How fast the avatar signs',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    footer: 'SIGNOVA 1.0 · Made for deaf and hard-of-hearing students',
  },
};

export type ScreenStrings = typeof en;

const ka: ScreenStrings = {
  lessons: {
    title: 'ჟესტური ენის გაკვეთილები',
    sub: 'აირჩიეთ თემა და ისწავლეთ მისი ჟესტები სათითაოდ.',
    back: 'ყველა გაკვეთილი',
    practice: 'ივარჯიშეთ კამერით',
    meta: (n: number, min: number) => `${n} ჟესტი · ${min} წთ`,
    cats: {
      alphabet: { title: 'ანბანი', line: 'ქართული ანბანის პირველი ასოები.', min: 4 },
      basics: { title: 'ძირითადი ფრაზები', line: 'მისალმება და თავაზიანი სიტყვები.', min: 5 },
      school: { title: 'კლასში', line: 'ჟესტები გაკვეთილზე კითხვის დასასმელად.', min: 10 },
    },
    items: {
      alphabet: [
        { id: 'a1', name: 'ასო ა', how: 'შეკარით მუშტი და ცერა თითი საჩვენებელი თითის გვერდზე მიადეთ.' },
        { id: 'a2', name: 'ასო ბ', how: 'ოთხი თითი ერთად ზემოთ გამართეთ, ცერა თითი კი ხელისგულზე მოკეცეთ.' },
        { id: 'a3', name: 'ასო გ', how: 'საჩვენებელი და ცერა თითი ქვემოთ მიმართეთ, დანარჩენი თითები მოკეცილი დატოვეთ.' },
        { id: 'a4', name: 'ასო დ', how: 'საჩვენებელი და შუა თითი ერთად ზემოთ გამართეთ, ცერა თითი კი მათ მიადეთ.' },
      ],
      basics: [
        { id: 'b1', name: 'გამარჯობა', how: 'ღია ხელისგული შუბლთან მიიტანეთ და წინ გაიტანეთ.' },
        { id: 'b2', name: 'მადლობა', how: 'გაშლილი ხელის თითები ნიკაპს შეახეთ და ხელი წინ წაიღეთ.' },
        { id: 'b3', name: 'გთხოვთ', how: 'გაშლილი ხელისგული მკერდზე დაიდეთ და პატარა წრე მოხაზეთ.' },
        { id: 'b4', name: 'დიახ', how: 'მუშტი ზემოთ-ქვემოთ ამოძრავეთ, როგორც თავის დაქნევისას.' },
      ],
      school: [
        { id: 's1', name: 'მასწავლებელი', how: 'ორივე გაშლილი ხელი საფეთქლებთან მიიტანეთ, წინ გაწიეთ, შემდეგ კი ქვემოთ დაუშვით.' },
        { id: 's2', name: 'კითხვა', how: 'საჩვენებელი თითით ჰაერში კითხვის ნიშანი დახაზეთ.' },
        { id: 's3', name: 'გაგება', how: 'მუშტი შუბლთან მიიტანეთ და საჩვენებელი თითი სწრაფად ზემოთ გამართეთ.' },
        { id: 's4', name: 'ახსნა', how: 'ორივე ხელზე ცერა და საჩვენებელი თითი შეაერთეთ და ხელები მონაცვლეობით წინ და უკან ამოძრავეთ.' },
        { id: 's5', name: 'ამოცანა', how: 'ორივე ხელზე ორი თითი მოხარეთ, სახსრები ერთმანეთს მიადეთ და საპირისპირო მხარეს გადაატრიალეთ.' },
        { id: 's6', name: 'ნაბიჯი', how: 'ორივე გაშლილი ხელი ხელისგულით ქვემოთ დაიჭირეთ და რიგრიგობით წინ გადაადგილეთ, როგორც ფეხები.' },
        { id: 's7', name: 'საშინაო დავალება', how: 'ჯერ აჩვენეთ „სახლი“ (ლოყას შეეხეთ), შემდეგ „სამუშაო“ (ერთი მუშტით მეორე მაჯაზე მსუბუქად დააკაკუნეთ).' },
        { id: 's8', name: 'გამეორება', how: 'მოხრილი ხელის თითები მეორე, გაშლილ ხელისგულზე დაუშვით.' },
      ],
    },
  },
  history: {
    title: 'საუბრების ისტორია',
    sub: 'რაც გაკვეთილებზე ჟესტით ან ხმით ითქვა.',
    student: 'მოსწავლე · ჟესტით',
    teacher: 'მასწავლებელი · ხმით',
    days: en.history.days.map((d) => ({
      ...d,
      label: d.id === 'today' ? 'დღეს' : d.id === 'yesterday' ? 'გუშინ' : 'პარასკევი, 20 ნოემბერი',
    })),
  },
  settings: {
    title: 'პარამეტრები',
    groupLanguage: 'ენა',
    groupDisplay: 'ეკრანი',
    groupAvatar: 'ავატარი',
    appLang: 'აპლიკაციის ენა',
    appLangSub: 'მენიუ, ღილაკები და შეტყობინებები',
    signLang: 'ჟესტური ენა',
    signLangSub: 'ქართული (GESL) ან ამერიკული (ASL)',
    dark: 'მუქი რეჟიმი',
    darkSub: 'ღია ტექსტი მუქ ფონზე',
    captions: 'სუბტიტრები ავატარის ქვეშ',
    captionsSub: 'ტექსტი ჩანს, როცა ავატარი ჟესტებს აჩვენებს',
    speed: 'ჟესტების სიჩქარე',
    speedSub: 'რამდენად სწრაფად აჩვენებს ავატარი ჟესტებს',
    slow: 'ნელი',
    normal: 'საშუალო',
    fast: 'სწრაფი',
    footer: 'SIGNOVA 1.0 · შექმნილია ყრუ და სმენადაქვეითებული მოსწავლეებისთვის',
  },
};

export const screens = { en, ka };

/** The current language's strings for these screens. */
export function useScreens(): ScreenStrings {
  const { lang } = useApp();
  return screens[lang] ?? en;
}

/** Page frame shared by the three screens: left-aligned column, 48px gutter on wide, 16-20px on phones. */
export function usePageFrame(maxWidth = 1040) {
  const { width, wide } = useApp();
  const gutter = wide ? 48 : width >= 640 ? 32 : width < 400 ? 16 : 20;
  return { gutter, maxWidth, narrow: width < 640, wide };
}
