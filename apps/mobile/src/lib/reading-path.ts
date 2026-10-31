/**
 * The Today screen opens with the Restless Heart lesson (index 3), then walks
 * through the rest of the library before circling back to its first lessons.
 */
export function nextLessonIndex(
  lessonIds: readonly string[],
  completedLessons: readonly string[],
): number {
  if (lessonIds.length <= 0) return -1;

  const completed = new Set(completedLessons);
  for (let step = 0; step < lessonIds.length; step++) {
    const index = (3 + step) % lessonIds.length;
    if (!completed.has(lessonIds[index])) return index;
  }

  return -1;
}
