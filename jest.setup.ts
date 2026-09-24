import { configure } from '@testing-library/react-native';

// CI runners are slower than a laptop; the first render of a screen pays for
// module compilation. Wait for UI changes a little longer before failing.
configure({ asyncUtilTimeout: 5000 });
