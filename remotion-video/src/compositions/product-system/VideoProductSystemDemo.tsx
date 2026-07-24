import React from "react";
import type {CalculateMetadataFunction} from "remotion";
import {VideoProductSpecSchema, type VideoProductSpec} from "../../video-system/productSchema";
import {
  VideoProductComposition,
  metadataForVideoProductSpec,
} from "../../video-system/templates/ProductNarrative";
import {DEFAULT_VIDEO_PRODUCT_SPEC} from "./defaultProductSpec";

const productSpecOrDefault = (props: unknown) => {
  const parsed = VideoProductSpecSchema.safeParse(props);
  return parsed.success ? parsed.data : DEFAULT_VIDEO_PRODUCT_SPEC;
};

export const calculateVideoProductDemoMetadata: CalculateMetadataFunction<VideoProductSpec> = async ({props}) => ({
  ...metadataForVideoProductSpec(productSpecOrDefault(props)),
  props: productSpecOrDefault(props),
});

export const VideoProductSystemDemo: React.FC<VideoProductSpec> = (props) => (
  <VideoProductComposition {...productSpecOrDefault(props)} />
);
