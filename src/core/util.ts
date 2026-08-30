export async function getJsonGzipped(path: string): Promise<any> {
    const response  = await fetch(chrome.runtime.getURL(path));
    const gzipStream  = response.body;
    if (!gzipStream) {
        throw new Error(`No response body for ${path}`);
    }
    const decompressedStream = gzipStream.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(decompressedStream).json();
}
