import { byId } from '../support/selectors';

export const welcomeScreen = {
    joinAsAdmin: () => byId('Join as Survey Admin'),
    joinAsSurveyor: () => byId('Join as Surveyor'),
};
