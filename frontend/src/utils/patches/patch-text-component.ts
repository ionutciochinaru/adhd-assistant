import * as RN from "react-native";
import { createTransformProps } from "react-fast-hoc";

export default () => {
    if (RN.Platform.OS !== "android") {
        return;
    }

    const styles = RN.StyleSheet.create({
        font: { fontFamily: "Roboto" },
    });

    const transform = createTransformProps(
        (props) => ({
            textBreakStrategy: "simple",
            numberOfLines: 0,
            ...props,
            style: [styles.font, props.style],
        }),
        {
            namePrefix: "Reset.",
            mimicToNewComponent: false,
        },
    );

    Object.assign(RN.Text, transform(RN.Text));
};