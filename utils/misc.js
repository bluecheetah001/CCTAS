// util for showing an error from a callback
export function showError(e) {
    try {
        ig.system.error(e);
    } catch(e2) {
        // ig.system.error throws the given error, but this does not want to throw
        if(e !== e2) {
            // shouldn't happen, just being safe
            throw e2;
        }
    }
}
