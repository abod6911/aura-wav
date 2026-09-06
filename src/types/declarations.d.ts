declare module 'jsmediatags' {
  const jsmediatags: {
    read: (
      file: Blob | File | string,
      callbacks: {
        onSuccess: (tag: any) => void;
        onError: (error: any) => void;
      }
    ) => void;
  };
  export default jsmediatags;
}
