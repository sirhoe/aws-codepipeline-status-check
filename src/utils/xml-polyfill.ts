import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";

export function installXmlPolyfill() {
  // Ensure DOM APIs exist for AWS SDK XML parsing inside the service worker.
  const globalAny = globalThis as any;
  if (typeof globalAny.DOMParser === "undefined") {
    globalAny.DOMParser = XmldomDOMParser;
  }
  if (typeof globalAny.Node === "undefined") {
    globalAny.Node = {
      ELEMENT_NODE: 1,
      ATTRIBUTE_NODE: 2,
      TEXT_NODE: 3,
      CDATA_SECTION_NODE: 4,
      ENTITY_REFERENCE_NODE: 5,
      ENTITY_NODE: 6,
      PROCESSING_INSTRUCTION_NODE: 7,
      COMMENT_NODE: 8,
      DOCUMENT_NODE: 9,
      DOCUMENT_TYPE_NODE: 10,
      DOCUMENT_FRAGMENT_NODE: 11,
      NOTATION_NODE: 12
    };
  }
}

