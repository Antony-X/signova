/**
 * The demo conversations. The student's line is "read" from the camera, the teacher's line is
 * "heard" from the microphone; both reveal word by word.
 */
export type Turn = {
  who: 'student' | 'teacher';
  ka: string;
  en: string;
  /** Avatar clip keys (see components/avatar/clips). */
  glosses: string[];
};

export type Sign = { ka: string; en: string; how: string; howKa: string };

export type Scenario = {
  id: 'greeting' | 'problem';
  student: Turn;
  teacher: Turn;
  /** The teacher's answer as the avatar signs it, one card per sign, in order. */
  teacherSigns: Sign[];
  /** How long the student takes to sign the line. */
  studentSeconds: number;
  /** Prefix of the student's word audio in public/audio (g1.mp3, g2.mp3 …). */
  audio: string;
};

export const STUDENT: Turn = {
  who: 'student',
  ka: 'შეგიძლიათ რომ ეს ამოცანა ამიხსნათ?',
  en: 'Can you explain this problem to me?',
  glosses: ['can', 'you', 'this', 'problem', 'explain'],
};

export const TEACHER: Turn = {
  who: 'teacher',
  ka: 'რომელი ნაბიჯი ვერ გაიგე?',
  en: 'Which step didn’t you understand?',
  glosses: ['which', 'step', 'not', 'understand'],
};

export const SCENARIOS: Record<Scenario['id'], Scenario> = {
  greeting: {
    id: 'greeting',
    student: { who: 'student', ka: 'გამარჯობა, მე ვარ ელენე.', en: 'Hello, I am Elene.', glosses: ['hello', 'you', 'elene'] },
    teacher: { who: 'teacher', ka: 'გამარჯობა, ელენე!', en: 'Hello, Elene!', glosses: ['hello', 'elene'] },
    teacherSigns: [
      { ka: 'გამარჯობა,', en: 'hello', how: 'Flat hand at the forehead moves outward, like a salute.', howKa: 'გაშლილი ხელი შუბლიდან წინ, სალმის მსგავსად.' },
      { ka: 'ელენე!', en: 'Elene', how: 'The name is fingerspelled: ე-ლ-ე-ნ-ე.', howKa: 'სახელი დაქტილით: ე-ლ-ე-ნ-ე.' },
    ],
    studentSeconds: 4.8,
    audio: 'g',
  },
  problem: {
    id: 'problem',
    student: STUDENT,
    teacher: TEACHER,
    teacherSigns: [
      { ka: 'რომელი', en: 'which', how: 'Palm up, fingers spread. Shake side to side at chest level.', howKa: 'ხელისგული ზემოთ, თითები გაშლილი. გვერდიდან გვერდზე, მკერდის დონეზე.' },
      { ka: 'ნაბიჯი', en: 'step', how: 'Both palms down. The right hand arcs forward like a step.', howKa: 'ორივე ხელისგული ქვემოთ. მარჯვენა ხელი რკალით წინ, ნაბიჯივით.' },
      { ka: 'ვერ', en: 'could not', how: 'Thumb and little finger out. Arc forward at face level.', howKa: 'ცერა თითი და ნეკი გაშლილი. რკალით წინ, სახის დონეზე.' },
      { ka: 'გაიგე?', en: 'understand', how: 'Index finger to the temple, then the right hand down onto the left palm.', howKa: 'საჩვენებელი თითი საფეთქელთან, შემდეგ მარჯვენა ხელი მარცხენა ხელისგულზე.' },
    ],
    studentSeconds: 6,
    audio: 'p',
  },
};

/** The conversation the demo opens with. */
export const DEFAULT_SCENARIO: Scenario['id'] = 'greeting';
