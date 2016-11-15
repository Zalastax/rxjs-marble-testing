import { State } from 'gm'

declare module 'gm' {
    interface State {
        draw(...args: string[]): State;
    }
}
