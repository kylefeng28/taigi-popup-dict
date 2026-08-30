export async function getJsonGzipped(path: str): Promise<any> {
    const response  = await fetch(chrome.runtime.getURL(path));
    const gzipStream  = response.body;
    const decompressedStream = gzipStream.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(decompressedStream).json();
}
