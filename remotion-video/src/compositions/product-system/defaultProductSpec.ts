import productSystemFixture from "../../../examples/video-product-system.json";
import {VideoProductSpecSchema} from "../../video-system/productSchema";
import {durationInFramesForVideoProductSpec, metadataForVideoProductSpec} from "../../video-system/templates/ProductNarrative";

export const DEFAULT_VIDEO_PRODUCT_SPEC = VideoProductSpecSchema.parse(productSystemFixture);
export const DEFAULT_VIDEO_PRODUCT_METADATA = metadataForVideoProductSpec(DEFAULT_VIDEO_PRODUCT_SPEC);
export const DEFAULT_VIDEO_PRODUCT_DURATION = durationInFramesForVideoProductSpec(DEFAULT_VIDEO_PRODUCT_SPEC);
