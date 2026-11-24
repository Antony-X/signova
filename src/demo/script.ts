/**
 * The demo conversation. The student's line is "read" from the camera, the teacher's line is
 * "heard" from the microphone; both are revealed word by word in step with real hand motion and
 * real voice level, so the timing follows the people in front of the device.
 */
export type Turn = {
  who: 'student' | 'teacher';
  ka: string;
  en: string;
  /** Avatar clip keys (see components/avatar/clips). */
  glosses: string[];
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

/**
 * The teacher's answer as the avatar signs it, one card per sign, in order.
 * How-to lines follow the Georgian Sign Language dictionary entries (T. Makharoblidze).
 */
export const TEACHER_SIGNS = [
  { ka: 'რომელი', en: 'which', how: 'Palm up, fingers spread. Shake side to side at chest level.', howKa: 'ხელისგული ზემოთ, თითები გაშლილი. გვერდიდან გვერდზე, მკერდის დონეზე.' },
  { ka: 'ნაბიჯი', en: 'step', how: 'Both palms down. The right hand arcs forward like a step.', howKa: 'ორივე ხელისგული ქვემოთ. მარჯვენა ხელი რკალით წინ, ნაბიჯივით.' },
  { ka: 'ვერ', en: 'could not', how: 'Thumb and little finger out. Arc forward at face level.', howKa: 'ცერა თითი და ნეკი გაშლილი. რკალით წინ, სახის დონეზე.' },
  { ka: 'გაიგე?', en: 'understand', how: 'Index finger to the temple, then the right hand down onto the left palm.', howKa: 'საჩვენებელი თითი საფეთქელთან, შემდეგ მარჯვენა ხელი მარცხენა ხელისგულზე.' },
];

export const TEACHER_WORDS = TEACHER_SIGNS.map((x) => x.ka);
