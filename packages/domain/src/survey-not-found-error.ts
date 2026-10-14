/** No survey matches the given code (as opposed to a failure reaching the backend). */
export class SurveyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SurveyNotFoundError';
  }
}
